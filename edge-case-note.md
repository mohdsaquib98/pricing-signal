# Edge Case Note

### 1. Competitor Price Below Margin Floor

**Example:** SKU-007 (Competitor: ₹399, Margin Floor: ₹420)

The system prevents recommendations below the margin floor by categorizing these SKUs as **"No Action Possible"** and suggesting alternative strategies instead of price matching.

---

### 2. Multiple Competitors

**Scenario:** Different competitors have different prices for the same SKU.

**Current assumption:** The provided competitor price represents the most relevant or lowest competitor price.

**Future enhancement:** Support multiple competitor prices and generate recommendations based on the broader competitive landscape.

---

### 3. Competitor Price Equals Margin Floor

**Scenario:** The competitor price is equal to our margin floor.

This creates a very thin-margin situation where winning the Buy Box may not justify the profitability risk. Such cases should be flagged for manual review rather than fully automated repricing.

---

### 4. Recently Repriced Items

**Scenario:** Items repriced very recently (e.g., "Today").

Frequent price changes can create instability. In a production system, recently repriced SKUs could have cooldown periods or lower urgency scores to avoid unnecessary repricing cycles.
