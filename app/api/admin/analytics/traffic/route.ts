import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { apiSuccess } from "@/lib/api-helpers";
import { createApiRoute } from "@/lib/createApiRoute";

export const GET = createApiRoute(
  async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Run all 8 independent queries in parallel instead of sequentially
    const [
      cavalosViewsResult,
      eventosViewsResult,
      topCavalosResult,
      topEventosResult,
      leadsResult,
      totalLeadsResult,
      recentLeadsResult,
      previousLeadsResult,
    ] = await Promise.all([
      Promise.resolve(supabase.from("cavalos_venda").select("views_count")).catch(() => ({
        data: null,
        error: null,
      })),
      Promise.resolve(supabase.from("eventos").select("views_count")).catch(() => ({
        data: null,
        error: null,
      })),
      Promise.resolve(
        supabase
          .from("cavalos_venda")
          .select("id, nome, views_count")
          .order("views_count", { ascending: false })
          .limit(10)
      ).catch(() => ({ data: null, error: null })),
      Promise.resolve(
        supabase
          .from("eventos")
          .select("id, titulo, views_count")
          .order("views_count", { ascending: false })
          .limit(10)
      ).catch(() => ({ data: null, error: null })),
      Promise.resolve(supabase.from("leads").select("utm_source, utm_medium, utm_campaign")).catch(
        () => ({ data: null, error: null })
      ),
      Promise.resolve(supabase.from("leads").select("*", { count: "exact", head: true })).catch(
        () => ({ count: null, error: null })
      ),
      Promise.resolve(
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString())
      ).catch(() => ({ count: null, error: null })),
      Promise.resolve(
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sixtyDaysAgo.toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString())
      ).catch(() => ({ count: null, error: null })),
    ]);

    const cavalos = (cavalosViewsResult.data as { views_count: number }[] | null) || [];
    const eventos = (eventosViewsResult.data as { views_count: number }[] | null) || [];
    const topCavalos =
      (topCavalosResult.data as { id: string; nome: string; views_count: number }[] | null) || [];
    const topEventos =
      (topEventosResult.data as { id: string; titulo: string; views_count: number }[] | null) || [];
    const leads =
      (leadsResult.data as
        | { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null }[]
        | null) || [];

    const totalCavalosViews = cavalos.reduce((sum, c) => sum + (c.views_count || 0), 0);
    const totalEventosViews = eventos.reduce((sum, e) => sum + (e.views_count || 0), 0);
    const totalViews = totalCavalosViews + totalEventosViews;

    const totalContent = cavalos.length + eventos.length;
    const averageViewsPerContent = totalContent > 0 ? totalViews / totalContent : 0;

    // Aggregate traffic sources
    const trafficSources: Record<string, number> = {};
    leads.forEach((lead) => {
      const source = lead.utm_source || "Direto";
      trafficSources[source] = (trafficSources[source] || 0) + 1;
    });
    const trafficSourcesArray = Object.entries(trafficSources)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalLeads = (totalLeadsResult as { count: number | null }).count || 0;
    const recentLeads = (recentLeadsResult as { count: number | null }).count || 0;
    const previousLeads = (previousLeadsResult as { count: number | null }).count || 0;

    const leadsGrowth =
      previousLeads > 0
        ? ((recentLeads - previousLeads) / previousLeads) * 100
        : recentLeads > 0
          ? 100
          : 0;

    return apiSuccess({
      overview: {
        totalViews,
        totalCavalosViews,
        totalEventosViews,
        averageViewsPerContent: parseFloat(averageViewsPerContent.toFixed(2)),
        totalLeads,
        recentLeads,
        leadsGrowth: parseFloat(leadsGrowth.toFixed(2)),
      },
      topCavalos: topCavalos.map((c) => ({
        id: c.id,
        name: c.nome,
        views: c.views_count || 0,
      })),
      topEventos: topEventos.map((e) => ({
        id: e.id,
        name: e.titulo,
        views: e.views_count || 0,
      })),
      trafficSources: trafficSourcesArray,
      contentTypeBreakdown: [
        { type: "Cavalos à Venda", views: totalCavalosViews, count: cavalos.length },
        { type: "Eventos", views: totalEventosViews, count: eventos.length },
      ],
    });
  },
  { auth: "admin" }
);
