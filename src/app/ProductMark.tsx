import productMarkUrl from "../assets/product-mark.png";

export function ProductMark() {
  return (
    <span className="product-mark" aria-hidden="true">
      <img src={productMarkUrl} alt="" />
    </span>
  );
}
