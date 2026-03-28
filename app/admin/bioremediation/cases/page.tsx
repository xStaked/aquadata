import { BookOpenText, CircleCheckBig, Clock3, ShieldCheck } from 'lucide-react'
import { CaseFormDialog } from '@/components/admin/case-library/case-form-dialog'
import { CaseCsvImportDialog } from '@/components/admin/case-library/case-csv-import-dialog'
import { CaseTable, type CaseTableRow } from '@/components/admin/case-library/case-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAdminUser } from '@/lib/auth/roles'

export default async function AdminBioremediationCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; species?: string; product?: string }>
}) {
  const { status, species, product } = await searchParams
  const selectedStatus = status && status !== 'all' ? status : null
  const selectedSpecies = species && species !== 'all' ? species : null
  const selectedProduct = product && product !== 'all' ? product : null

  const { supabase } = await requireAdminUser()

  let casesQuery = supabase
    .from('bioremediation_cases')
    .select('*')
    .order('updated_at', { ascending: false })

  if (selectedStatus) {
    casesQuery = casesQuery.eq('status', selectedStatus)
  }

  if (selectedSpecies) {
    casesQuery = casesQuery.eq('species', selectedSpecies)
  }

  if (selectedProduct) {
    casesQuery = casesQuery.eq('product_name', selectedProduct)
  }

  const [casesRes, filterOptionsRes, profilesRes] = await Promise.allSettled([
    casesQuery,
    supabase
      .from('bioremediation_cases')
      .select('status, species, product_name, status_usable_for_grounding'),
    supabase.from('profiles').select('id, full_name'),
  ])

  const caseRows = casesRes.status === 'fulfilled' ? casesRes.value.data ?? [] : []
  const filterRows = filterOptionsRes.status === 'fulfilled' ? filterOptionsRes.value.data ?? [] : []
  const profiles = profilesRes.status === 'fulfilled' ? profilesRes.value.data ?? [] : []

  const profileMap = new Map(
    profiles.map((profile) => [profile.id, profile.full_name || 'Administrador Aquavet']),
  )

  const rows: CaseTableRow[] = caseRows.map((row) => ({
    ...row,
    author_name: profileMap.get(row.author_id) ?? 'Administrador Aquavet',
    reviewer_name: row.last_reviewed_by ? profileMap.get(row.last_reviewed_by) ?? 'Administrador Aquavet' : null,
  }))

  const speciesOptions = Array.from(new Set(filterRows.map((row) => row.species))).sort((a, b) =>
    a.localeCompare(b),
  )
  const productOptions = Array.from(new Set(filterRows.map((row) => row.product_name))).sort((a, b) =>
    a.localeCompare(b),
  )

  const approvedCount = rows.filter((row) => row.status === 'approved').length
  const draftCount = rows.filter((row) => row.status === 'draft').length
  const groundingCount = rows.filter((row) => row.status_usable_for_grounding).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Biblioteca gobernada
          </p>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Casos de bioremediacion listos para revision
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Administra el inventario de casos que servira como fuente gobernada para el assistant.
              Solo los casos con estado aprobado quedan elegibles para assistant grounding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CaseCsvImportDialog />
          <CaseFormDialog />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Casos totales</CardTitle>
            <BookOpenText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aprobados</CardTitle>
            <CircleCheckBig className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes de revision</CardTitle>
            <Clock3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{draftCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usables para grounding</CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{groundingCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-base">Gestion de casos</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Filtra por estado, especie o producto para revisar el inventario gobernado.
            </p>
          </div>

          <form className="flex flex-wrap items-center gap-2" method="GET">
            <select
              name="status"
              defaultValue={selectedStatus ?? 'all'}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="approved">Aprobado</option>
              <option value="retired">Retirado</option>
            </select>
            <select
              name="species"
              defaultValue={selectedSpecies ?? 'all'}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todas las especies</option>
              {speciesOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              name="product"
              defaultValue={selectedProduct ?? 'all'}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos los productos</option>
              {productOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Filtrar
            </button>
          </form>
        </CardHeader>
        <CardContent>
          <CaseTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  )
}
