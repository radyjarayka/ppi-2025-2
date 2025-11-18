import styles from "./Header.module.css";
import { ShoppingBasket } from "lucide-react";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import { ThemeToggle } from "./ThemeToggle";
import { SessionContext } from "../context/SessionContext";

export function Header() {
  const { cart } = useContext(CartContext);
  const { session } = useContext(SessionContext);

  // normaliza/parseia price e quantity para números seguros
  const cartCount = cart.reduce(
    (total, item) => total + Number(item?.quantity ?? 0),
    0
  );

  const cartTotal = cart
    .reduce((total, product) => {
      // remove qualquer caractere que não seja dígito, ponto ou sinal
      const priceRaw = product?.price ?? 0;
      const price =
        typeof priceRaw === "number"
          ? priceRaw
          : parseFloat(String(priceRaw).replace(/[^0-9.-]+/g, "")) || 0;

      const quantity = Number(product?.quantity ?? 0);
      return total + price * quantity;
    }, 0)
    .toFixed(2);

  return (
    <div className={styles.container}>
      <div>
        <Link to="/" className={styles.link}>
          <h1>TRJ Megastore</h1>
        </Link>
        {session && (
          <Link to="/user" className={styles.welcomeMessage}>
            Welcome, {session.user.user_metadata.username}{" "}
            {session.user.user_metadata.admin && "⭐"}
          </Link>
        )}
      </div>

      <div className={styles.actions}>
        {!session && (
          <>
            <Link to="/signin" className={styles.link}>
              Sign In
            </Link>
            <Link to="/register" className={styles.link}>
              Register
            </Link>
          </>
        )}
        <ThemeToggle />
        <Link to="/cart" className={styles.link}>
          <div className={styles.cartInfo}>
            <div className={styles.cartIcon}>
              <ShoppingBasket size={32} />
              {cartCount > 0 && (
                <span className={styles.cartCount}>{cartCount}</span>
              )}
            </div>

            <p>
              Total: ${" "}
              {cartTotal}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}