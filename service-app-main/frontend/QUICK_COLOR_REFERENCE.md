# 🎯 Color Implementation Quick Reference

## Component Color Quick Reference

Copy and paste these color classes for consistent UI components:

---

## 🔘 Buttons

### Primary Action Button (Main CTA)

```html
<button
  class="bg-cyan-600 text-white hover:bg-cyan-700 px-4 py-2 rounded-lg font-medium transition-colors"
>
  Book Service
</button>
```

### Secondary Action Button

```html
<button
  class="bg-teal-600 text-white hover:bg-teal-700 px-4 py-2 rounded-lg font-medium transition-colors"
>
  Learn More
</button>
```

### Ghost Button (Outline)

```html
<button
  class="border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-50 px-4 py-2 rounded-lg font-medium transition-colors"
>
  View Details
</button>
```

---

## 📢 Badges & Tags

### Success Badge

```html
<span
  class="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium"
>
  ✓ Confirmed
</span>
```

### Primary Badge

```html
<span
  class="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm font-medium"
>
  Active
</span>
```

### Info Badge

```html
<span
  class="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-medium"
>
  ℹ️ Information
</span>
```

---

## 🎨 Cards & Sections

### Primary Card (Featured)

```html
<div
  class="bg-white rounded-lg border-2 border-cyan-200 p-6 shadow-lg hover:shadow-xl transition-shadow"
>
  <h3 class="text-cyan-700 font-bold">Featured Service</h3>
  <p>Card content goes here</p>
</div>
```

### Success Card

```html
<div class="bg-emerald-50 rounded-lg border-2 border-emerald-200 p-6">
  <h3 class="text-emerald-700 font-bold">✓ Success</h3>
  <p>Your booking has been confirmed</p>
</div>
```

### Info Card

```html
<div class="bg-teal-50 rounded-lg border-2 border-teal-200 p-6">
  <h3 class="text-teal-700 font-bold">ℹ️ Information</h3>
  <p>Important details about your service</p>
</div>
```

---

## 📊 Data Visualization

### Charts & Metrics (Colors array)

```javascript
const chartColors = [
  "#06b6d4", // Cyan - Primary metric
  "#14b8a6", // Teal - Secondary metric
  "#22c55e", // Emerald - Success/Growth
  "#8b5cf6", // Purple - Additional data
  "#f59e0b", // Amber - Warning metric
];
```

---

## 🔔 Alerts & Messages

### Success Alert

```html
<div class="bg-emerald-100 border-l-4 border-emerald-500 p-4 text-emerald-700">
  <p class="font-bold">Success!</p>
  <p>Your booking has been confirmed successfully.</p>
</div>
```

### Info Alert

```html
<div class="bg-cyan-100 border-l-4 border-cyan-500 p-4 text-cyan-700">
  <p class="font-bold">Information</p>
  <p>Please note this important information about your booking.</p>
</div>
```

### Warning Alert

```html
<div class="bg-amber-100 border-l-4 border-amber-500 p-4 text-amber-700">
  <p class="font-bold">Warning</p>
  <p>Please review this before proceeding.</p>
</div>
```

### Error Alert

```html
<div class="bg-red-100 border-l-4 border-red-500 p-4 text-red-700">
  <p class="font-bold">Error</p>
  <p>There was an issue with your request.</p>
</div>
```

---

## 🏷️ Status Indicators

### Status Dots

```html
<!-- Active/Online (Cyan) -->
<span class="inline-block w-3 h-3 rounded-full bg-cyan-600"></span>

<!-- Available (Emerald) -->
<span class="inline-block w-3 h-3 rounded-full bg-emerald-600"></span>

<!-- Pending (Teal) -->
<span class="inline-block w-3 h-3 rounded-full bg-teal-600"></span>

<!-- Inactive (Gray) -->
<span class="inline-block w-3 h-3 rounded-full bg-gray-400"></span>
```

---

## 🎭 Gradients

### Cyan to Teal Gradient

```html
<div
  class="bg-gradient-to-r from-cyan-600 to-teal-600 text-white p-8 rounded-lg"
>
  <h2>Beautiful Gradient Section</h2>
</div>
```

### Teal to Emerald Gradient

```html
<div
  class="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-8 rounded-lg"
>
  <h2>Success Gradient</h2>
</div>
```

### Bottom to Top Gradient

```html
<div class="bg-gradient-to-b from-cyan-50 to-white p-8">
  Content with subtle gradient background
</div>
```

---

## 🖼️ Navigation & Sidebar

### Active Nav Item

```html
<a
  href="#"
  class="bg-cyan-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
>
  <Icon />
  Active Page
</a>
```

### Inactive Nav Item

```html
<a
  href="#"
  class="text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
>
  <Icon />
  Other Page
</a>
```

---

## 📝 Form Elements

### Input Focus (Cyan)

```html
<input
  type="text"
  class="border-2 border-gray-300 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 px-4 py-2 rounded-lg"
  placeholder="Enter value..."
/>
```

### Checkbox (Cyan)

```html
<input type="checkbox" class="w-4 h-4 accent-cyan-600 rounded" />
```

### Select/Dropdown

```html
<select
  class="border-2 border-gray-300 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 px-4 py-2 rounded-lg"
>
  <option>Choose option...</option>
  <option>Option 1</option>
</select>
```

---

## ⭐ Rating & Reviews

### 5-Star Rating (Emerald)

```html
<div class="flex gap-1">
  <span class="text-emerald-500">★</span>
  <span class="text-emerald-500">★</span>
  <span class="text-emerald-500">★</span>
  <span class="text-emerald-500">★</span>
  <span class="text-emerald-500">★</span>
</div>
```

### Partial Rating

```html
<div class="flex gap-1">
  <span class="text-emerald-500">★</span>
  <span class="text-emerald-500">★</span>
  <span class="text-emerald-500">★</span>
  <span class="text-emerald-500">★</span>
  <span class="text-gray-300">★</span>
</div>
```

---

## 🔐 User Actions

### Confirm/Delete Button

```html
<button
  class="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-medium"
>
  Confirm Delete
</button>
```

### Undo/Cancel Button

```html
<button
  class="bg-gray-400 text-white hover:bg-gray-500 px-4 py-2 rounded-lg font-medium"
>
  Cancel
</button>
```

---

## 🎪 Hover Effects

### Card Hover with Color Change

```html
<div
  class="bg-white border border-gray-200 rounded-lg p-6 hover:border-cyan-300 hover:shadow-cyan-100 hover:shadow-lg transition-all duration-300"
>
  Content here
</div>
```

### Link Hover

```html
<a
  href="#"
  class="text-cyan-600 hover:text-cyan-700 hover:underline font-medium"
>
  Link Text
</a>
```

---

## ✨ Loading & Skeleton

### Loading Spinner (Cyan)

```html
<div class="animate-spin">
  <div
    class="w-8 h-8 border-4 border-cyan-200 border-t-cyan-600 rounded-full"
  ></div>
</div>
```

### Skeleton Loader

```html
<div class="space-y-4">
  <div class="h-4 bg-cyan-100 rounded animate-pulse"></div>
  <div class="h-4 bg-cyan-100 rounded animate-pulse w-5/6"></div>
</div>
```

---

## 📐 Spacing with Colors

### Divider Lines

```html
<!-- Cyan divider -->
<div
  class="h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
></div>

<!-- Teal divider -->
<div
  class="h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent"
></div>
```

---

## 🔄 State Examples

### Button States

```html
<!-- Default -->
<button class="bg-cyan-600 text-white">Action</button>

<!-- Hover -->
<button class="bg-cyan-600 hover:bg-cyan-700 text-white">Action</button>

<!-- Active/Pressed -->
<button class="bg-cyan-700 text-white">Action</button>

<!-- Disabled -->
<button class="bg-cyan-300 text-white opacity-50 cursor-not-allowed">
  Action
</button>

<!-- Loading -->
<button class="bg-cyan-600 text-white" disabled>
  <span class="animate-spin">⟳</span> Loading...
</button>
```

---

## 📞 Call-to-Action Sections

### Hero CTA

```html
<div
  class="bg-gradient-to-r from-cyan-600 to-teal-600 text-white p-12 rounded-lg text-center"
>
  <h1 class="text-4xl font-bold mb-4">Ready to Book?</h1>
  <button
    class="bg-white text-cyan-600 px-8 py-3 rounded-lg font-bold hover:bg-cyan-50"
  >
    Get Started Now
  </button>
</div>
```

---

## 💾 Quick Copy Reference

### Color Hex Values:

```
Cyan: #06b6d4
Teal: #14b8a6
Emerald: #22c55e
```

### CSS Variables:

```
--primary: 191 96% 36%      (Cyan)
--secondary: 172 86% 42%     (Teal)
--accent: 142 71% 45%        (Emerald)
```

---

## 🎓 Usage Priority

1. **Always use for primary actions** → Cyan
2. **For secondary options** → Teal
3. **For success/positive states** → Emerald
4. **For warnings/caution** → Amber/Orange
5. **For errors/danger** → Red
6. **For neutral/info** → Gray

---

This quick reference should help you implement the new color matching system consistently throughout your application! 🎨
