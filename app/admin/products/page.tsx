import { FlaskConical, Tags } from 'lucide-react'
import { requireAdminUser } from '@/lib/auth/roles'
import { ProductFormDialog } from '@/components/admin/products/product-form-dialog'
import { ProductTable, type ProductTableRow } from '@/components/admin/products/product-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminProductsPage() {
  const { supabase } = await requireAdminUser()

  const { data: products = [] } = await supabase
    .from('bioremediation_products')
    .select('id, name, category, description, dose_unit, species_scope, presentation, is_active, image_url')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const rows = products as ProductTableRow[]
  const activeCount = rows.filter((row) => row.is_active).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Catalogo gobernado
          </p>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Productos de bioremediacion
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Registra los productos oficiales para reutilizarlos en filtros, casos y futuras reglas
              del modulo admin.
            </p>
          </div>
        </div>

        <ProductFormDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productos totales</CardTitle>
            <Tags className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productos activos</CardTitle>
            <FlaskConical className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{activeCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventario administrable</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Activa o desactiva productos sin afectar los registros historicos que ya guardan el nombre como texto.
          </p>
        </CardHeader>
        <CardContent>
          <ProductTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  )
}
