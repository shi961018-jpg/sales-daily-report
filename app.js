const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const dateValueFormatter = new Intl.DateTimeFormat("sv-SE");

const $ = (selector) => document.querySelector(selector);

const elements = {
  reportDate: $("#reportDate"),
  salesList: $("#salesList"),
  addRow: $("#addRowButton"),
  grandTotal: $("#grandTotal"),
  productCount: $("#productCount"),
  quantityTotal: $("#quantityTotal"),
  costTotal: $("#costTotal"),
  profitTotal: $("#profitTotal"),
  profitRate: $("#profitRate"),
  emptyReport: $("#emptyReport"),
  reportContent: $("#reportContent"),
  reportLead: $("#reportLead"),
  ranking: $("#ranking"),
  copy: $("#copyButton"),
  toast: $("#toast")
};

let nextRowId = 1;
let toastTimer;

function createRow(values = {}) {
  const id = nextRowId++;
  const row = document.createElement("article");
  row.className = "sales-row";
  row.dataset.rowId = String(id);
  row.innerHTML = `
    <label class="field name">
      <span class="field-label">商品名称</span>
      <input class="product-name" type="text" placeholder="例如：旗舰礼盒" value="${values.name || ""}" aria-label="商品名称">
    </label>
    <label class="field">
      <span class="field-label">销量</span>
      <input class="quantity" type="number" min="0" step="1" placeholder="0" value="${values.quantity || ""}" aria-label="销量">
    </label>
    <label class="field">
      <span class="field-label">单价</span>
      <input class="unit-price" type="number" min="0" step="0.01" placeholder="0.00" value="${values.price || ""}" aria-label="售价">
    </label>
    <label class="field">
      <span class="field-label">成本价</span>
      <input class="cost-price" type="number" min="0" step="0.01" placeholder="0.00" value="${values.cost || ""}" aria-label="成本价">
    </label>
    <div class="amount-wrap">
      <span class="field-label">销售额</span>
      <span class="amount" aria-label="销售额">${currency.format(0)}</span>
    </div>
    <div class="profit-wrap">
      <span class="field-label">毛利</span>
      <span class="profit" aria-label="毛利">${currency.format(0)}</span>
    </div>
    <button class="delete-button" type="button" aria-label="删除此商品">×</button>
  `;
  elements.salesList.append(row);
  calculateReport();
}

function getRows() {
  return Array.from(elements.salesList.querySelectorAll(".sales-row")).map((row) => {
    const name = row.querySelector(".product-name").value.trim();
    const quantity = Number(row.querySelector(".quantity").value) || 0;
    const price = Number(row.querySelector(".unit-price").value) || 0;
    const costPrice = Number(row.querySelector(".cost-price").value) || 0;
    const amount = quantity * price;
    const cost = quantity * costPrice;
    const profit = amount - cost;
    const profitRate = amount ? (profit / amount) * 100 : 0;
    row.querySelector(".amount").textContent = currency.format(amount);
    const profitElement = row.querySelector(".profit");
    profitElement.textContent = `${currency.format(profit)} (${formatRate(profitRate)})`;
    profitElement.classList.toggle("negative", profit < 0);
    return { name, quantity, price, costPrice, amount, cost, profit, profitRate };
  });
}

function formatRate(rate) {
  return `${rate.toFixed(2)}%`;
}

function getSelectedDateText() {
  if (!elements.reportDate.value) {
    return dateFormatter.format(new Date());
  }
  return dateFormatter.format(new Date(`${elements.reportDate.value}T00:00:00`));
}

function calculateReport() {
  const rows = getRows();
  const meaningfulRows = rows.filter((row) => row.name || row.quantity || row.price || row.costPrice);
  const validRows = rows.filter((row) => row.name && row.quantity > 0 && row.price >= 0);
  const total = validRows.reduce((sum, row) => sum + row.amount, 0);
  const totalCost = validRows.reduce((sum, row) => sum + row.cost, 0);
  const totalProfit = validRows.reduce((sum, row) => sum + row.profit, 0);
  const totalProfitRate = total ? (totalProfit / total) * 100 : 0;
  const quantity = validRows.reduce((sum, row) => sum + row.quantity, 0);

  elements.grandTotal.textContent = currency.format(total);
  elements.productCount.textContent = String(validRows.length);
  elements.quantityTotal.textContent = String(quantity);
  elements.costTotal.textContent = currency.format(totalCost);
  elements.profitTotal.textContent = currency.format(totalProfit);
  elements.profitTotal.classList.toggle("negative", totalProfit < 0);
  elements.profitRate.textContent = formatRate(totalProfitRate);
  elements.profitRate.classList.toggle("negative", totalProfit < 0);

  if (!meaningfulRows.length || !validRows.length) {
    elements.emptyReport.hidden = false;
    elements.reportContent.hidden = true;
    return;
  }

  const orderedRows = [...validRows].sort((left, right) => right.amount - left.amount);
  const leader = orderedRows[0];
  elements.emptyReport.hidden = true;
  elements.reportContent.hidden = false;
  elements.reportLead.innerHTML = `${getSelectedDateText()}共销售 <strong>${quantity}</strong> 件商品，实现销售额 <strong>${currency.format(total)}</strong>，总成本 <strong>${currency.format(totalCost)}</strong>，毛利 <strong>${currency.format(totalProfit)}</strong>，综合毛利率 <strong>${formatRate(totalProfitRate)}</strong>。销售贡献最高的商品为 <strong>${leader.name}</strong>。`;
  elements.ranking.innerHTML = orderedRows.map((row, index) => `
    <div class="ranking-item">
      <span>${index + 1}. ${row.name} · ${row.quantity} 件 · 销售 ${currency.format(row.amount)}</span>
      <strong${row.profit < 0 ? ' class="negative"' : ""}>毛利 ${currency.format(row.profit)}</strong>
    </div>
  `).join("");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 1800);
}

async function copySummary() {
  if (elements.reportContent.hidden) {
    showToast("请先录入有效销售数据");
    return;
  }
  const rows = getRows().filter((row) => row.name && row.quantity > 0 && row.price >= 0);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);
  const totalProfitRate = total ? (totalProfit / total) * 100 : 0;
  const text = [
    `销售日报 - ${getSelectedDateText()}`,
    `总销售额：${currency.format(total)}`,
    `总成本：${currency.format(totalCost)}`,
    `总毛利：${currency.format(totalProfit)}（毛利率 ${formatRate(totalProfitRate)}）`,
    `总销量：${rows.reduce((sum, row) => sum + row.quantity, 0)} 件`,
    "",
    "商品明细：",
    ...rows.map((row, index) => `${index + 1}. ${row.name} | 销量 ${row.quantity} | 售价 ${currency.format(row.price)} | 成本价 ${currency.format(row.costPrice)} | 销售额 ${currency.format(row.amount)} | 毛利 ${currency.format(row.profit)} (${formatRate(row.profitRate)})`)
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("日报摘要已复制");
  } catch {
    showToast("当前无法复制，请手动选择文本");
  }
}

function wireActions() {
  elements.addRow.addEventListener("click", () => createRow());
  elements.reportDate.addEventListener("change", calculateReport);
  elements.salesList.addEventListener("input", calculateReport);
  elements.salesList.addEventListener("click", (event) => {
    const button = event.target.closest(".delete-button");
    if (!button) {
      return;
    }
    button.closest(".sales-row").remove();
    if (!elements.salesList.children.length) {
      createRow();
      return;
    }
    calculateReport();
  });
  elements.copy.addEventListener("click", copySummary);
}

function init() {
  elements.reportDate.value = dateValueFormatter.format(new Date());
  createRow();
  createRow();
  wireActions();
}

init();
