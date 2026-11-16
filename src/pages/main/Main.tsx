import { useMemo, useState, useEffect, useRef } from "react";
import styles from "./Main.module.css";
import { FoodCard } from "../../components/food/FoodCard";
import {
  PlusCircle,
  LayoutGrid,
  CupSoda,
  IceCream,
  ShoppingCart,
  HamburgerIcon,
  Star,
  ArrowDown,
  ArrowRight,
  Flame,
  Bike,
  ShieldCheck,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/Header/Header";
import { MainSkeleton } from "../../components/skeletons/main/MainSkeleton";
import type { FoodResponseDto } from "../../dtos/Food-Response.Dto";
import { toast, ToastContainer } from "react-toastify";
import { useStoreStatus } from "../../hooks/useStoreStatus";
import { ProductService } from "../../service/product.service";

const categoryIcons: Record<string, LucideIcon> = {
  Sanduíches: HamburgerIcon,
  Bebidas: CupSoda,
  Adicionais: PlusCircle,
  Sobremesas: IceCream,
};

export default function Main() {
  const [category, setCategory] = useState<string | null>(null);
  const navigation = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<FoodResponseDto[]>([]);
  const [productsError, setProductsError] = useState("");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [cartActived, setCartActivedCart] = useState(false);
  const storeStatus = useStoreStatus();
  const openNow = storeStatus.openNow;

  function activedCart() {
    setCartActivedCart(true);
    setTimeout(() => {
      setCartActivedCart(false);
    }, 7000);
  }
  useEffect(() => {
    let active = true;

    ProductService.findAll()
      .then((data) => {
        if (!active) return;
        setProducts(data);
        setProductsError("");
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
        setProductsError("Não foi possível carregar os produtos agora.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);
  const left = storeStatus.hoursToOpen;

  useEffect(() => {
    if (storeStatus.loading) return;

    const KEY = "mb_store_toast_shown_v1";
    try {
      const already = localStorage.getItem(KEY);
      if (!already) {
        if (openNow) {
          toast.success("Estabelecimento aberto", { autoClose: 2500 });
        } else {
          const left = storeStatus.hoursToOpen;
          toast.error(
            `Fechado, abrimos em ${left} ${left === 1 ? "hora" : "horas"}`,
            { autoClose: 2500 },
          );
        }
        localStorage.setItem(KEY, "1");
      }
    } catch {
      console.log("error");
    }
  }, [openNow, storeStatus.hoursToOpen, storeStatus.loading]);

  useEffect(() => {
    searchRef.current?.blur();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category))).map((name) => ({
      name,
      icon: categoryIcons[name],
    }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = p.name.toLowerCase();
      const desc = (p.desc || "").toLowerCase();
      const cat = p.category.toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [products, search]);

  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce(
      (acc, product) => {
        (acc[product.category] ||= []).push(product);
        return acc;
      },
      {} as Record<string, FoodResponseDto[]>,
    );
  }, [filteredProducts]);

  const goDetails = (item: FoodResponseDto) => {
    navigation(`/foodDetails?id=${item.id}`, {
      state: {
        item,
        productsMock: products,
      },
    });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.page}>
        <ToastContainer position="top-right" />
        {cartActived && (
          <div className={styles.cartFloat}>
            <button
              className={styles.headerCartActived}
              type="button"
              onClick={() => navigation("/cart")}
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={20} />
            </button>
          </div>
        )}

        <Header
          storeOpen={storeStatus.loading ? undefined : openNow}
          search={search}
          searchRef={searchRef}
          onCartClick={() => navigation("/cart")}
          onSearchChange={setSearch}
          onClearSearch={() => {
            setSearch("");
            searchRef.current?.blur();
          }}
        />

        {loading ? (
          <MainSkeleton />
        ) : (
          <div className={styles.containerSec} data-enter="page">
            <section className={styles.hero}>
              <div className={styles.heroOverlay} aria-hidden="true" />
              <div className={styles.heroCenter}>
                <div className={styles.heroContent}>
                  <div className={styles.heroBadges}>
                    <span className={`${styles.openBadge} ${!openNow ? styles.closedBadge : ""}`}>
                      <span className={styles.statusDot} aria-hidden="true" />
                      {openNow ? "ABERTO AGORA" : "FECHADO"}
                    </span>

                    <span className={styles.ratingBadge}>
                      <Star size={14} /> 4.8
                    </span>
                    {!openNow && (
                      <span className={styles.openBadgeHors}>
                        Abrimos em {left} {left === 1 ? "hora" : "horas"}
                      </span>
                    )}
                  </div>
                  <p className={styles.heroEyebrow}><span>Bem-vindo à Burguer</span></p>
                  <h1 className={styles.heroTitle}>
                    <span className={styles.heroTitleFirst}>Hambúrguer</span>{" "}
                    <span className={styles.heroTitleSecond}>
                      Artesanal<span className={styles.heroDesktopWord}> de</span>
                      <Crown className={styles.heroCrown} aria-hidden="true" />
                    </span>{" "}
                    <span className={styles.heroAccent}>
                      <span className={styles.heroMobileWord}>de </span>Verdade!
                    </span>
                  </h1>
                  <p className={styles.heroDesc}>
                    <span className={styles.heroDesktopDescription}>
                      Ingredientes selecionados, sabor incomparável e aquele
                      combo perfeito para matar a sua fome.
                    </span>
                    <span className={styles.heroMobileDescription}>
                      Sabor irresistível em cada <strong>mordida.</strong>
                    </span>
                  </p>
                  <div className={styles.heroArtworkSpace} aria-hidden="true" />
                  <button
                    type="button"
                    className={styles.menuButton}
                    onClick={() => menuRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    <ShoppingCart size={17} />
                    Ver Cardápio
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </section>

            <ul className={styles.heroBenefits} aria-label="Diferenciais da Burguer">
              <li><HamburgerIcon aria-hidden="true" /><span>Ingredientes<br />Selecionados</span></li>
              <li><Flame aria-hidden="true" /><span>Sabor<br />Artesanal</span></li>
              <li><Bike aria-hidden="true" /><span>Entrega<br />Rápida</span></li>
              <li><ShieldCheck aria-hidden="true" /><span>Qualidade<br />Garantida</span></li>
            </ul>

            <div className={styles.menuHeading}>
              <div>
                <h2><Flame size={29} /> Nosso cardápio</h2>
              </div>
              <span className={styles.menuHint}>Escolha seu favorito <ArrowDown size={16} /></span>
            </div>
            <div className={styles.categoryRow} ref={menuRef} role="group" aria-label="Categorias do cardápio">
              <button
                type="button"
                onClick={() => setCategory(null)}
                aria-pressed={category === null}
                className={`${styles.categoryPill} ${category === null ? styles.categoryActive : ""
                  }`}
              >
                <LayoutGrid size={32} aria-hidden="true" />
                <span>Todos</span>
              </button>

              {categories.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setCategory(item.name)}
                    aria-pressed={category === item.name}
                    className={`${styles.categoryPill} ${category === item.name ? styles.categoryActive : ""
                      }`}
                  >
                    <Icon size={32} aria-hidden="true" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>



            {productsError ? (
              <div className={styles.emptyState}>
                <h2>Produtos indisponíveis</h2>
                <p>{productsError}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <h2>Nenhum produto encontrado</h2>
                <p>
                  Cadastre produtos no admin para eles aparecerem aqui no
                  cardápio.
                </p>
              </div>
            ) : (
              Object.entries(
                category === null
                  ? groupedProducts
                  : { [category]: groupedProducts[category] },
              ).map(([cat, items = []]) => {
                const Icon = categoryIcons[cat];
                if (!items.length || !Icon) return null;
                return (
                  <section key={cat} className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionLeft}>
                        <Icon size={20} />
                        <h2 className={styles.sectionTitle}>{cat}</h2>
                      </div>
                      <span className={styles.sectionCount}>
                        <span className={styles.sectionQuant}>
                          {items.length}
                        </span>
                        <span> opções</span>
                      </span>
                    </div>

                    <div
                      className={
                        cat === "Bebidas" ? styles.grid3 : styles.grid4
                      }
                    >
                      {items.map((item) => (
                        <FoodCard
                          key={item.id}
                          id={item.id}
                          name={item.name}
                          desc={item.desc}
                          price={item.price}
                          originalPrice={item.originalPrice}
                          img={item.img}
                          badge={item.badge}
                          onDetails={() => goDetails(item)}
                          functions={() => activedCart()}
                        />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        )}
        <footer className={styles.footer}>
          <span className={styles.footerText}>
            Desenvolvido por Anderson Mendes
          </span>
          <a
            className={styles.footerHandle}
            href="https://instagram.com/andersonmends__"
            target="_blank"
            rel="noreferrer"
          >
            @AndersonMends__
          </a>
        </footer>
      </div>
    </div>
  );
}
