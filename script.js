const catalog = window.OMO_CATALOG || {};
const ORDER_EMAIL = catalog.orderEmail || "orders@omo.stunning";
const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: catalog.currency || "USD",
  maximumFractionDigits: 0,
});

const products = catalog.products || [];
const filters =
  catalog.filters ||
  ["All", ...new Set(products.flatMap((product) => product.tags || []))].slice(0, 8);
const defaultOptionGroups = catalog.defaultOptionGroups || [
  {
    id: "fit",
    label: "Fit",
    choices: ["XS", "S", "M", "L", "Custom"],
  },
];

const state = {
  filter: "All",
  search: "",
  cart: loadCart(),
};

const productGrid = document.querySelector("[data-products]");
const filterContainer = document.querySelector("[data-filters]");
const searchInput = document.querySelector("[data-search]");
const resultCount = document.querySelector("[data-result-count]");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const cartItems = document.querySelector("[data-cart-items]");
const cartCountNodes = document.querySelectorAll("[data-cart-count]");
const subtotalNode = document.querySelector("[data-subtotal]");
const overlay = document.querySelector("[data-drawer-overlay]");
const form = document.querySelector("[data-checkout-form]");
const statusNode = document.querySelector("[data-form-status]");

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("omo-stunning-cart")) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem("omo-stunning-cart", JSON.stringify(state.cart));
}

function productById(id) {
  return products.find((product) => product.id === id);
}

function productMatches(product) {
  const tags = product.tags || [];
  const filterMatch = state.filter === "All" || tags.includes(state.filter);
  const search = state.search.trim().toLowerCase();
  const searchable = [product.name, product.description, ...tags].join(" ").toLowerCase();
  return filterMatch && (!search || searchable.includes(search));
}

function money(value) {
  return CURRENCY.format(value);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeChoice(choice) {
  if (typeof choice === "string") {
    return { label: choice, value: choice, priceDelta: 0 };
  }

  const label = choice.label || choice.value || "Option";
  return {
    label,
    value: choice.value || label,
    priceDelta: Number(choice.priceDelta || 0),
  };
}

function optionGroupsFor(product) {
  return [...defaultOptionGroups, ...(product.optionGroups || [])].filter(
    (group) => group.choices?.length,
  );
}

function hasPaidOptions(product) {
  return optionGroupsFor(product).some((group) =>
    group.choices.map(normalizeChoice).some((choice) => choice.priceDelta > 0),
  );
}

function optionText(choice) {
  return choice.priceDelta > 0
    ? `${choice.label} +${money(choice.priceDelta)}`
    : choice.label;
}

function optionsForCartItem(item) {
  if (item.options?.length) return item.options;
  if (item.size) return [{ id: "fit", label: "Fit", value: item.size, priceDelta: 0 }];
  return [];
}

function cartItemUnitPrice(item) {
  const product = productById(item.id);
  if (!product) return 0;
  return (
    Number(product.price || 0) +
    optionsForCartItem(item).reduce((sum, option) => sum + Number(option.priceDelta || 0), 0)
  );
}

function cartItemKey(item) {
  const options = optionsForCartItem(item)
    .map((option) => `${option.id}:${option.value}:${option.priceDelta || 0}`)
    .join("|");
  return `${item.id}|${options}`;
}

function selectedOptions(card) {
  return Array.from(card?.querySelectorAll("[data-option-select]") || []).map((select) => {
    const selected = select.selectedOptions[0];
    return {
      id: select.dataset.optionId,
      label: select.dataset.optionLabel,
      value: selected.value,
      priceDelta: Number(selected.dataset.priceDelta || 0),
    };
  });
}

function renderFilters() {
  filterContainer.innerHTML = filters
    .map(
      (filter) => `
        <button
          type="button"
          role="tab"
          aria-selected="${filter === state.filter}"
          data-filter="${filter}"
        >${escapeHtml(filter)}</button>
      `,
    )
    .join("");
}

function renderProductCard(product, compact = false) {
  const tags = product.tags || [];
  const colors = product.colors || [];
  const optionGroups = optionGroupsFor(product);
  const priceLabel = `${hasPaidOptions(product) ? "from " : ""}${money(Number(product.price || 0))}`;

  return `
    <article class="product-card ${compact ? "is-compact" : ""}" data-product-card="${escapeHtml(product.id)}">
      <div class="product-media">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt)}" loading="eager">
        <span class="product-price">${priceLabel}</span>
      </div>
      <div class="product-body">
        <div class="product-title-row">
          <div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(tags.slice(0, 2).join(" / "))}</p>
          </div>
        </div>
        <p>${escapeHtml(product.description)}</p>
        <ul class="swatch-list" aria-label="${escapeHtml(product.name)} colors">
          ${colors
            .map((color) => `<li style="background:${escapeHtml(color)}" aria-hidden="true"></li>`)
            .join("")}
        </ul>
        <ul class="tag-list" aria-label="${escapeHtml(product.name)} tags">
          ${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
        </ul>
        <div class="product-options">
          ${optionGroups
            .map(
              (group) => `
                <label>
                  ${escapeHtml(group.label)}
                  <select
                    data-option-select
                    data-option-id="${escapeHtml(group.id)}"
                    data-option-label="${escapeHtml(group.label)}"
                  >
                    ${group.choices
                      .map((choice) => normalizeChoice(choice))
                      .map(
                        (choice) => `
                          <option
                            value="${escapeHtml(choice.value)}"
                            data-price-delta="${choice.priceDelta}"
                          >${escapeHtml(optionText(choice))}</option>
                        `,
                      )
                      .join("")}
                  </select>
                </label>
              `,
            )
            .join("")}
          <button type="button" data-add="${escapeHtml(product.id)}">Add to bag</button>
        </div>
      </div>
    </article>
  `;
}

function renderCatalog() {
  const visibleProducts = products.filter(productMatches);
  productGrid.innerHTML = visibleProducts.map((product) => renderProductCard(product)).join("");
  resultCount.textContent =
    visibleProducts.length === 1
      ? "1 set matches your mood."
      : `${visibleProducts.length} sets match your mood.`;
}

function cartQuantity() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartSubtotal() {
  return state.cart.reduce((sum, item) => {
    return sum + cartItemUnitPrice(item) * item.quantity;
  }, 0);
}

function renderCart() {
  const count = cartQuantity();
  cartCountNodes.forEach((node) => {
    node.textContent = count;
  });
  subtotalNode.textContent = money(cartSubtotal());

  if (!state.cart.length) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <p>Your bag is waiting for a set that makes you smile.</p>
        <a href="#shop" data-close-cart>Browse the collection</a>
      </div>
    `;
    return;
  }

  cartItems.innerHTML = state.cart
    .map((item, index) => {
      const product = productById(item.id);
      if (!product) return "";

      return `
        <article class="cart-line">
          <img src="${escapeHtml(product.image)}" alt="" loading="lazy">
          <div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(optionsForCartItem(item).map((option) => `${option.label}: ${option.value}`).join(" / "))} / ${money(cartItemUnitPrice(item))} each</p>
            <div class="cart-line-actions">
              <button class="qty-button" type="button" data-adjust="${index}" data-delta="-1" aria-label="Decrease ${escapeHtml(product.name)} quantity">-</button>
              <strong>${item.quantity}</strong>
              <button class="qty-button" type="button" data-adjust="${index}" data-delta="1" aria-label="Increase ${escapeHtml(product.name)} quantity">+</button>
              <button class="remove-button" type="button" data-remove="${index}">Remove</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function addToCart(button) {
  const productId = button.dataset.add;
  const card = button.closest("[data-product-card]");
  const item = {
    id: productId,
    options: selectedOptions(card),
    quantity: 1,
  };
  const existing = state.cart.find((cartItem) => cartItemKey(cartItem) === cartItemKey(item));

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push(item);
  }

  saveCart();
  renderCart();
  openCart();
}

function adjustCart(index, delta) {
  const item = state.cart[index];
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart.splice(index, 1);
  }
  saveCart();
  renderCart();
}

function removeCartItem(index) {
  state.cart.splice(index, 1);
  saveCart();
  renderCart();
}

function openCart() {
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
  document.body.classList.add("drawer-open");
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  document.body.classList.remove("drawer-open");
}

function orderSummary(formData = new FormData(form)) {
  const lines = state.cart
    .map((item) => {
      const product = productById(item.id);
      if (!product) return "";
      const options = optionsForCartItem(item)
        .map((option) => `${option.label}: ${option.value}`)
        .join(", ");
      return `${item.quantity} x ${product.name} (${options}) - ${money(cartItemUnitPrice(item) * item.quantity)}`;
    })
    .filter(Boolean);

  return [
    "omo.stunning order request",
    "",
    `Name: ${formData.get("name") || ""}`,
    `Contact: ${formData.get("contact") || ""}`,
    "",
    "Sets:",
    ...lines,
    "",
    `Subtotal: ${money(cartSubtotal())}`,
    "",
    `Notes: ${formData.get("notes") || ""}`,
  ].join("\n");
}

function handleCheckout(event) {
  event.preventDefault();

  if (!state.cart.length) {
    statusNode.textContent = "Add at least one nail set before sending an order.";
    return;
  }

  const formData = new FormData(form);
  const summary = orderSummary(formData);
  const subject = encodeURIComponent("omo.stunning order request");
  const body = encodeURIComponent(summary);

  statusNode.textContent = "Opening your email app with the order request.";
  window.location.href = `mailto:${ORDER_EMAIL}?subject=${subject}&body=${body}`;
}

async function copyOrder() {
  if (!state.cart.length) {
    statusNode.textContent = "Add at least one nail set before copying an order.";
    return;
  }

  try {
    await navigator.clipboard.writeText(orderSummary());
    statusNode.textContent = "Order copied.";
  } catch {
    statusNode.textContent = "Copy did not work in this browser. You can still send the order request.";
  }
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.matches("[data-open-cart]")) openCart();
  if (target.matches("[data-close-cart]")) closeCart();
  if (target.matches("[data-add]")) addToCart(target);

  const filter = target.dataset.filter;
  if (filter) {
    state.filter = filter;
    renderFilters();
    renderCatalog();
  }

  const adjustIndex = target.dataset.adjust;
  if (adjustIndex !== undefined) {
    adjustCart(Number(adjustIndex), Number(target.dataset.delta));
  }

  const removeIndex = target.dataset.remove;
  if (removeIndex !== undefined) {
    removeCartItem(Number(removeIndex));
  }

  if (target.matches("[data-copy-order]")) copyOrder();
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderCatalog();
});

overlay.addEventListener("click", closeCart);
form.addEventListener("submit", handleCheckout);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCart();
});

renderFilters();
renderCatalog();
renderCart();
