const root = document.querySelector(".hero");
if (root) {
  root.animate(
    [{ transform: "translateY(10px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
    { duration: 500, easing: "ease-out" },
  );
}
