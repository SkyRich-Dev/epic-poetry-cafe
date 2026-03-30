import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, purchasesTable, expensesTable, salesEntriesTable, wasteEntriesTable, ingredientsTable, vendorsTable, menuItemsTable } from "@workspace/db";
import { authMiddleware } from "../lib/auth";

const router: IRouter = Router();

router.get("/reports/export", authMiddleware, async (req, res): Promise<void> => {
  const reportType = req.query.reportType as string;
  const fromDate = req.query.fromDate as string;
  const toDate = req.query.toDate as string;

  let csvContent = "";

  switch (reportType) {
    case "purchases": {
      const data = await db
        .select({
          purchaseNumber: purchasesTable.purchaseNumber,
          purchaseDate: purchasesTable.purchaseDate,
          vendorName: vendorsTable.name,
          totalAmount: purchasesTable.totalAmount,
          paymentStatus: purchasesTable.paymentStatus,
        })
        .from(purchasesTable)
        .leftJoin(vendorsTable, eq(purchasesTable.vendorId, vendorsTable.id));
      csvContent = "Purchase Number,Date,Vendor,Amount,Status\n" + data.map(d => `${d.purchaseNumber},${d.purchaseDate},${d.vendorName},${d.totalAmount},${d.paymentStatus}`).join("\n");
      break;
    }
    case "expenses": {
      const data = await db.select().from(expensesTable);
      csvContent = "Expense Number,Date,Amount,Type,Description\n" + data.map(d => `${d.expenseNumber},${d.expenseDate},${d.totalAmount},${d.costType},${d.description || ""}`).join("\n");
      break;
    }
    case "sales": {
      const data = await db
        .select({
          salesDate: salesEntriesTable.salesDate,
          menuItemName: menuItemsTable.name,
          quantity: salesEntriesTable.quantity,
          totalAmount: salesEntriesTable.totalAmount,
          channel: salesEntriesTable.channel,
        })
        .from(salesEntriesTable)
        .leftJoin(menuItemsTable, eq(salesEntriesTable.menuItemId, menuItemsTable.id));
      csvContent = "Date,Item,Quantity,Amount,Channel\n" + data.map(d => `${d.salesDate},${d.menuItemName},${d.quantity},${d.totalAmount},${d.channel}`).join("\n");
      break;
    }
    case "waste": {
      const data = await db
        .select({
          wasteNumber: wasteEntriesTable.wasteNumber,
          wasteDate: wasteEntriesTable.wasteDate,
          wasteType: wasteEntriesTable.wasteType,
          quantity: wasteEntriesTable.quantity,
          costValue: wasteEntriesTable.costValue,
          reason: wasteEntriesTable.reason,
        })
        .from(wasteEntriesTable);
      csvContent = "Waste Number,Date,Type,Quantity,Cost,Reason\n" + data.map(d => `${d.wasteNumber},${d.wasteDate},${d.wasteType},${d.quantity},${d.costValue},${d.reason || ""}`).join("\n");
      break;
    }
    case "ingredients": {
      const data = await db.select().from(ingredientsTable);
      csvContent = "Code,Name,Stock UOM,Current Stock,Cost,Active\n" + data.map(d => `${d.code},${d.name},${d.stockUom},${d.currentStock},${d.weightedAvgCost},${d.active}`).join("\n");
      break;
    }
    default:
      csvContent = "No data available for this report type";
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${reportType}_report.csv`);
  res.send(csvContent);
});

export default router;
