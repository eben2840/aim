import { useState, useEffect } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { productsApi } from "../../api";
import type { Product } from "../../types";

export default function CategoryDashboard() {
  const { category } = useParams<{ category: string }>();
  const name = category ? decodeURIComponent(category) : "";
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    productsApi.list({ category: name, pageSize: 100 })
      .then((res) => { setProducts(res.data); setTotal(res.total); })
      .finally(() => setLoading(false));
  }, [name]);

  const totalStock = products.reduce((s, p) => s + (p.totalStock ?? 0), 0);
  const lowStockCount = products.filter((p) => (p.totalStock ?? 0) < 10).length;
  const totalValue = products.reduce((s, p) => s + (p.totalStock ?? 0) * p.costPrice, 0);

  return (
    <>
      <PageMeta title={`${name} | AbiTrack`} description={`${name} category overview`} />
      <PageBreadCrumb pageTitle={name} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {([["Products", total], ["Total Stock", totalStock], ["Low Stock", lowStockCount]] as [string, number][]).map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Products <span className="text-sm font-normal text-gray-500">· ${totalValue.toFixed(2)} stock value</span>
          </h2>
        </div>
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : products.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">No products in this category.</p>
          ) : (
            <Table>
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  {["SKU", "Name", "Stock", "Cost", "Price"].map((h) => (
                    <TableCell key={h} isHeader className="py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">{h}</TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="py-3 text-xs font-mono text-gray-600 dark:text-gray-400">{p.sku}</TableCell>
                    <TableCell className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">{p.name}</TableCell>
                    <TableCell className="py-3">
                      <Badge size="sm" color={(p.totalStock ?? 0) === 0 ? "error" : (p.totalStock ?? 0) < 10 ? "warning" : "success"}>
                        {p.totalStock ?? 0} {p.unit}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-gray-500">${p.costPrice.toFixed(2)}</TableCell>
                    <TableCell className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">${p.sellingPrice.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
