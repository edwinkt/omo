# omo.stunning

Static storefront for Anna Pham's handmade nail press-ons.

Open `index.html` in a browser to view the site. Product images are optimized in `assets/` from the originals in the project folder, with metadata stripped for safer public use.

The cart and order request flow work in the browser. Update `orderEmail` in `catalog.js` when Anna has a preferred order email or replace the mailto flow with a payment provider checkout.

## Adding Products Later

Most future shop updates should happen in `catalog.js`, not in the site code.

To add a new nail set:

1. Add the product photo to `assets/`.
2. Copy one product block in `catalog.js`.
3. Change the `id`, `name`, `price`, `image`, `alt`, `description`, `tags`, and `colors`.

Example:

```js
{
  id: "pearl-cloud",
  name: "Pearl Cloud",
  price: 39,
  image: "assets/pearl-cloud.jpg",
  alt: "Soft pearl press-on nails with cloudy shimmer",
  description: "A soft pearly set with clouded shimmer and tiny stones.",
  tags: ["Soft", "Pearl", "Bridal"],
  colors: ["#fff8f2", "#e9f1f0", "#f5dce3"],
}
```

To add purchase options, edit `defaultOptionGroups` for options that apply to every set, or add `optionGroups` inside one product for set-specific choices. Choices can include `priceDelta` for paid upgrades.

```js
optionGroups: [
  {
    id: "length",
    label: "Length",
    choices: ["Short", "Medium", { label: "Long", priceDelta: 4 }],
  },
]
```
