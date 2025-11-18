// src/context/CartContext.jsx
import { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../utils/supabase";
import { SessionContext } from "./SessionContext";

export const CartContext = createContext();

export function CartProvider({ children }) {
  const { session } = useContext(SessionContext);
  const [cartRaw, setCartRaw] = useState([]); // rows da tabela cart: { product_id, quantity, ... }
  const [cart, setCart] = useState([]); // itens enriquecidos com dados do produto
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Buscar produtos
  // fetchProducts disponível para refetch manual
  async function fetchProducts() {
    const { data, error } = await supabase.from("product_2v").select();
    if (error) console.error("Erro ao buscar produtos:", error);
    setProducts(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  // 🔹 Carregar carrinho do usuário autenticado (raw)
  useEffect(() => {
    fetchCart();
  }, [session]);

  // fetchCart disponível para refetch manual
  async function fetchCart() {
    if (!session?.user) {
      setCartRaw([]);
      return;
    }
    const { data, error } = await supabase
      .from("cart") // ALTERADO: CART para cart
      .select("*")
      .eq("user_id", session.user.id);
    if (error) console.error("Erro ao buscar carrinho:", error);
    setCartRaw(data || []);
  }

  // 🔹 Enriquecer cartRaw com dados dos products sempre que um dos dois mudar
  useEffect(() => {
    const enriched = cartRaw.map((row) => {
      const prod = products.find((p) => p.id === row.product_id) || {};
      // normaliza price e quantity
      const priceRaw = prod.price ?? row.price ?? 0;
      const price =
        typeof priceRaw === "number"
          ? priceRaw
          : parseFloat(String(priceRaw).replace(/[^0-9.-]+/g, "")) || 0;
      const quantity = Number(row.quantity ?? 0);

      return {
        // mantém referência ao product_id e fornece id para componentes que esperam id
        product_id: row.product_id,
        id: prod.id ?? row.product_id,
        title: prod.title ?? row.title ?? "",
        thumbnail: prod.thumbnail ?? row.thumbnail ?? "",
        price,
        quantity,
        // merge outras props do produto se necessário
        ...prod,
      };
    });
    setCart(enriched);
  }, [cartRaw, products]);

  // 🔹 Adicionar item ao carrinho
  // Função: adicionar produto ao carrinho
  async function addToCart(product) {
    try {
      console.debug("[addToCart] product:", product);
      console.debug("[addToCart] session:", session?.user?.id ?? session);

      const existing = cart.find((item) => item.id === product.id);

      if (existing) {
        // Se o produto já existe, aumenta a quantidade
        await updateQtyCart(product.id, existing.quantity + 1);
        return;
      }

      // Atualiza o estado local primeiro
      setCart((prev) => [...prev, { ...product, quantity: 1 }]);

      // Depois salva no banco (se logado)
      if (session?.user) {
        // insere e pede as linhas retornadas (.select()) para ver o resultado
        const res = await supabase
          .from("cart") // ALTERADO: CART para cart
          .insert({
            user_id: session.user.id,
            product_id: product.id,
            quantity: 1,
          })
          .select();

        console.debug("[addToCart] supabase insert result:", res);

        if (res.error) {
          console.error("Erro ao adicionar produto no Supabase:", res.error);
        } else {
          // refetch do cartRaw para refletir o que está no banco
          const { data: rows, error: fetchError } = await supabase
            .from("cart") // ALTERADO: CART para cart
            .select("*")
            .eq("user_id", session.user.id);
          if (fetchError) {
            console.error("Erro ao buscar carrinho após insert:", fetchError);
          } else {
            setCartRaw(rows || []);
          }
        }
      } else {
        console.info(
          "[addToCart] usuário não autenticado — apenas atualizei estado local"
        );
      }
    } catch (err) {
      console.error("[addToCart] unexpected error:", err);
    }
  }

  // Funções de administração de produtos (apenas lógica, permissões no Supabase necessárias)
  async function addProduct({ title, description, price, thumbnail }) {
    try {
      const { data, error } = await supabase
        .from("product_2v")
        .insert([{ title, description, price: Number(price), thumbnail }])
        .select();
      if (error) {
        console.error("Erro ao inserir produto:", error);
        return { error };
      }
      // refetch
      await fetchProducts();
      return { data };
    } catch (err) {
      console.error("[addProduct] unexpected error:", err);
      return { error: err };
    }
  }

  async function updateProduct(id, updates) {
    try {
      const { data, error } = await supabase
        .from("product_2v")
        .update(updates)
        .eq("id", id)
        .select();
      if (error) {
        console.error("Erro ao atualizar produto:", error);
        return { error };
      }
      await fetchProducts();
      return { data };
    } catch (err) {
      console.error("[updateProduct] unexpected error:", err);
      return { error: err };
    }
  }

  async function deleteProduct(id) {
    try {
      const { error } = await supabase.from("product_2v").delete().eq("id", id);
      if (error) {
        console.error("Erro ao deletar produto:", error);
        return { error };
      }
      await fetchProducts();
      return {};
    } catch (err) {
      console.error("[deleteProduct] unexpected error:", err);
      return { error: err };
    }
  }

  // Função: atualizar quantidade de um produto
  async function updateQtyCart(productId, quantity) {
    // Atualiza o estado local imediatamente
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );

    // Atualiza no banco (se o usuário estiver logado)
    if (session?.user) {
      const { error } = await supabase
        .from("cart") // ALTERADO: CART para cart
        .update({ quantity })
        .eq("user_id", session.user.id)
        .eq("product_id", productId);
      if (error)
        console.error("Erro ao atualizar quantidade no Supabase:", error);
    }
  }

  // Função: remover um produto do carrinho
  async function removeFromCart(productId) {
    // Atualiza localmente primeiro
    setCart((prev) => prev.filter((item) => item.id !== productId));

    // Depois remove do Supabase (se logado)
    if (session?.user) {
      const { error } = await supabase
        .from("cart") // ALTERADO: CART para cart
        .delete()
        .eq("user_id", session.user.id)
        .eq("product_id", productId);
      if (error) console.error("Erro ao remover produto no Supabase:", error);
    }
  }

  // Função: limpar todo o carrinho
  async function clearCart() {
    // Limpa localmente
    setCart([]);

    // E limpa no Supabase (se logado)
    if (session?.user) {
      const { error } = await supabase
        .from("cart") // ALTERADO: CART para cart
        .delete()
        .eq("user_id", session.user.id);
      if (error) console.error("Erro ao limpar carrinho no Supabase:", error);
    }
  }

  return (
    <CartContext.Provider
      value={{
        products,
        loading,
        cart, // itens enriquecidos (com price:number e quantity:number)
        addToCart,
        updateQtyCart,
        removeFromCart,
        clearCart,
        // admin / refresh helpers
        refreshProducts: fetchProducts,
        refreshCart: fetchCart,
        addProduct,
        updateProduct,
        deleteProduct,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}