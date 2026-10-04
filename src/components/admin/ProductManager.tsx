import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  toggleProductStatus,
} from "@/lib/product.functions";

interface ProductRow {
  id: string;
  name: string;
  service_id: string;
  service_name: string;
  max_quantity: number;
  price_per_unit: number;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
}

interface ProductForm {
  name: string;
  service_id: string;
  service_name: string;
  max_quantity: number;
  price_per_unit: number;
  description: string;
  is_active: boolean;
}

const emptyForm: ProductForm = {
  name: "",
  service_id: "",
  service_name: "",
  max_quantity: 1,
  price_per_unit: 0,
  description: "",
  is_active: true,
};

export function ProductManager() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const result = await getProducts();
      return result as ProductRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: ProductForm) => createProduct({ data: payload }),
    onSuccess: () => {
      toast.success("Product created");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setForm(emptyForm);
      setEditing(null);
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create product");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: ProductForm & { id: string }) => updateProduct({ data: payload }),
    onSuccess: () => {
      toast.success("Product updated");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setForm(emptyForm);
      setEditing(null);
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteProduct({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setConfirmDeleteId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete product");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => bulkDeleteProducts({ data: { ids } }),
    onSuccess: () => {
      toast.success("Products deleted");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedIds([]);
      setConfirmBulkDelete(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete products");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) =>
      toggleProductStatus({ data: { id, is_active } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update product status");
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (product: ProductRow) => {
    setEditing(product);
    setForm({
      name: product.name,
      service_id: product.service_id,
      service_name: product.service_name,
      max_quantity: product.max_quantity,
      price_per_unit: product.price_per_unit,
      description: product.description ?? "",
      is_active: product.is_active,
    });
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.service_id.trim() || !form.service_name.trim()) {
      toast.error("Please fill in required product fields");
      return;
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form });
      return;
    }

    createMutation.mutate(form);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading products...
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Products</h3>
          <p className="text-xs text-muted-foreground">
            Create, edit, activate, and bulk delete product listings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete selected ({selectedIds.length})
            </Button>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New product
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={products.length > 0 && selectedIds.length === products.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Max Qty</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No products yet. Add your first product.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={() => toggleSelection(product.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                  <TableCell>{product.service_name}</TableCell>
                  <TableCell>{product.max_quantity}</TableCell>
                  <TableCell>${Number(product.price_per_unit).toFixed(2)}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: product.id,
                          is_active: !product.is_active,
                        })
                      }
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        product.is_active
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      {product.is_active ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {product.is_active ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(product.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Create product"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Product name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Instagram followers package"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="service_id">Service ID</Label>
                <Input
                  id="service_id"
                  value={form.service_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, service_id: e.target.value }))}
                  placeholder="uuid"
                />
              </div>

              <div>
                <Label htmlFor="service_name">Service name</Label>
                <Input
                  id="service_name"
                  value={form.service_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, service_name: e.target.value }))}
                  placeholder="Instagram Followers"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="max_quantity">Max quantity</Label>
                <Input
                  id="max_quantity"
                  type="number"
                  min="1"
                  value={form.max_quantity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, max_quantity: Number(e.target.value || 1) }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="price_per_unit">Price per unit</Label>
                <Input
                  id="price_per_unit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_per_unit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      price_per_unit: Number(e.target.value || 0),
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional product details"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: checked === true }))
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active product
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete product</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this product from the catalog.
          </AlertDialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
              }}
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete selected products</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {selectedIds.length} product(s)? This action is
            permanent.
          </AlertDialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setConfirmBulkDelete(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
            >
              Delete all
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
