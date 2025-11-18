import { useContext, useState, useEffect } from "react";
import styles from "./User.module.css";
import { SessionContext } from "../context/SessionContext";
import { CartContext } from "../context/CartContext";
import { supabase } from "../utils/supabase";

export function User() {
  const { session, handleSignOut } = useContext(SessionContext);
  const { products, loading, error, refreshProducts, refreshCart } = useContext(CartContext);
  
  

  const [adminProducts, setAdminProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    title: "",
    description: "",
    price: "",
    thumbnail: "",
  });

  const isAdmin = session?.user?.user_metadata?.admin;

  // 🔹 Carregar produtos do banco
  async function fetchAdminProducts() {
    const { data, error } = await supabase
      .from("product_2v")
      .select("*")
      .order("title", { ascending: true });
    if (error) console.error(error);
    setAdminProducts(data || []);
  }

  useEffect(() => {
    if (isAdmin) {
      fetchAdminProducts();
    }
  }, [isAdmin]);

  // 🔹 Função auxiliar para atualizar tudo após uma modificação
  async function refreshAll() {
    await Promise.all([fetchAdminProducts(), refreshProducts(), refreshCart()]);
  }

  // 🔹 Deletar produto
  async function handleDelete(id) {
    const confirmDelete = window.confirm("Tem certeza que deseja excluir este produto?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("product_2v").delete().eq("id", id);
    if (error) {
      alert("Erro ao deletar produto: " + error.message);
      console.error(error);
      return;
    }

    await refreshAll();
  }

  // 🔹 Atualizar produto
  async function handleUpdate(id) {
    const { error } = await supabase
      .from("product_2v")
      .update({
        title: editingProduct.title,
        description: editingProduct.description,
        price: parseFloat(editingProduct.price),
        thumbnail: editingProduct.thumbnail,
      })
      .eq("id", id);

    if (error) console.error(error);
    setEditingProduct(null);
    await refreshAll();
  }

  // 🔹 Inserir novo produto
  async function handleInsert() {
    if (!newProduct.title || !newProduct.price) {
      alert("Preencha pelo menos o título e o preço!");
      return;
    }
    const { error } = await supabase.from("product_2v").insert({
      title: newProduct.title,
      description: newProduct.description,
      price: parseFloat(newProduct.price),
      thumbnail: newProduct.thumbnail,
    });
    if (error) {
      alert("Erro ao inserir produto: " + error.message);
      console.error(error);
      return;
    }
    setNewProduct({ title: "", description: "", price: "", thumbnail: "" });
    await refreshAll();
  }

  const visibleProducts = isAdmin ? adminProducts : products;

  return (
    <div className={styles.container}>
      {session ? (
        <>
          <h1>{isAdmin ? "Admin Account" : "User Account"}</h1>

          <div className={styles.userInfo}>
            <p>
              <strong>Username:</strong> {session.user.user_metadata.username}
            </p>
            <p>
              <strong>Email:</strong> {session.user.email}
            </p>
            <p>
              <strong>ID:</strong> {session.user.id}
            </p>
          </div>

          <button className={styles.button} onClick={handleSignOut}>
            SIGN OUT
          </button>

          {isAdmin && (
            <div className={styles.adminPanel}>
              <h2>Admin Panel</h2>

              {/* Formulário de inserção */}
              <h3>Insert New Product</h3>
              <div className={styles.form}>
                <input
                  type="text"
                  placeholder="Title"
                  value={newProduct.title}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, title: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, price: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Thumbnail URL"
                  value={newProduct.thumbnail}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      thumbnail: e.target.value,
                    })
                  }
                />
                <button onClick={handleInsert}>ADD PRODUCT</button>
              </div>

              {/* Lista de produtos */}
              <h3>Manage Products</h3>
              {loading && <p>Loading products...</p>}
              {error && <p>❌ {error}</p>}
              {visibleProducts.map((product) => (
                <div key={product.id} className={styles.productItem}>
                  {editingProduct?.id === product.id ? (
                    <>
                      <input
                        type="text"
                        value={editingProduct.title}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            title: e.target.value,
                          })
                        }
                      />
                      <input
                        type="text"
                        value={editingProduct.description}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            description: e.target.value,
                          })
                        }
                      />
                      <input
                        type="number"
                        value={editingProduct.price}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            price: e.target.value,
                          })
                        }
                      />
                      <input
                        type="text"
                        value={editingProduct.thumbnail}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            thumbnail: e.target.value,
                          })
                        }
                      />
                      <button onClick={() => handleUpdate(product.id)}>
                        SAVE
                      </button>
                      <button onClick={() => setEditingProduct(null)}>
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>{product.title}</strong> - ${product.price}
                      </p>
                      <button onClick={() => setEditingProduct(product)}>
                        EDIT
                      </button>
                      <button onClick={() => handleDelete(product.id)}>
                        DELETE
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <h1>User not signed in!</h1>
      )}
    </div>
  );
}
