import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function fetcher<T>(
  endpoint: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers = new Headers(options?.headers);
  let body = options?.body;

  if (options?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include",
    ...options,
    headers,
    body,
  });

  if (!res.ok) {
    let message = "API request failed";
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch (e) {
      // Ignore
    }
    throw new ApiError(res.status, message);
  }

  // Some endpoints might return 204 No Content
  if (res.status === 204) return {} as T;

  return res.json();
}

// ---------------------------------
// Types
// ---------------------------------

export type ActionStatus = "draft" | "awaiting_approval" | "published" | "funded" | "executing" | "completed" | "archived";

export interface Action {
  id: string;
  slug: string;
  title: string;
  category: string;
  publicDescription: string;
  goalCents: number | null;
  suggestedAmounts: number[];
  raisedCents: number;
  status: ActionStatus;
  createdAt: string;
}

export interface TransparencySummary {
  id: string;
  slug: string;
  title: string;
  paidCents: number;
  usedCents: number;
  balanceCents: number;
  expenses: { 
    id: string; 
    description: string; 
    category: string;
    amountCents: number; 
    paidAt: string | null; 
    publicReceiptPath: string | null;
  }[];
}

export interface User {
  userId: string;
  role: string;
  username?: string;
  name?: string;
  email?: string;
}

export type AuthNext = "totp" | "setup" | "password";
export interface AuthResponse { next: AuthNext }
export interface TotpSetup { secret: string; otpauthUrl: string }

export function useLogin() {
  return useMutation({ mutationFn: (data: { username: string; password: string }) =>
    fetcher<AuthResponse>("/auth/login", { method: "POST", json: data }) });
}
export function useChangePassword() {
  return useMutation({ mutationFn: (password: string) =>
    fetcher<AuthResponse>("/auth/password", { method: "POST", json: { password } }) });
}
export function useTotpSetup() {
  return useMutation({ mutationFn: () =>
    fetcher<TotpSetup>("/auth/totp/setup", { method: "POST" }) });
}
export function useTotpVerify() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (code: string) =>
    fetcher<{ userId: string; role: string }>("/auth/totp/verify", { method: "POST", json: { code } }),
    onSuccess: (user) => queryClient.setQueryData(["me"], user),
  });
}
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: () => fetcher<void>("/auth/logout", { method: "POST" }),
    onSuccess: () => queryClient.clear() });
}

export interface Donation {
  id: string;
  actionId: string;
  amountCents: number;
  refundedCents?: number;
  netAmountCents?: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  createdAt: string;
  paidAt: string | null;
}

export interface Expense {
  id: string;
  actionId: string;
  description: string;
  publicDescription?: string | null;
  category: string;
  amountCents: number;
  paidAt: string | null;
  publicReceiptPath?: string | null;
  originalReceiptPath?: string | null;
  reviewedReceiptPath?: string | null;
  status: "pending_review" | "approved" | "published" | "rejected";
  createdAt: string;
}

// ---------------------------------
// Public API
// ---------------------------------

export function usePublicActions() {
  return useQuery({
    queryKey: ["public", "actions"],
    queryFn: () => fetcher<Action[]>("/public/actions"),
  });
}

export function useTransparency() {
  return useQuery({
    queryKey: ["public", "transparency"],
    queryFn: () => fetcher<TransparencySummary[]>("/public/transparency"),
  });
}

export function useCheckoutStatus() {
  return useQuery({
    queryKey: ["public", "checkout-status"],
    queryFn: () => fetcher<{ available: boolean; reason: string }>("/public/checkout-status"),
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (data: { actionId: string; amountCents: number; anonymous?: boolean; communicationConsent?: boolean }) =>
      fetcher<{ checkoutUrl: string; donationId: string }>("/public/donations/create-checkout", {
        method: "POST",
        json: data,
      }),
  });
}

export function useCheckoutStatusResult(sessionId: string) {
  return useQuery({
    queryKey: ["public", "checkout-result", sessionId],
    queryFn: () => fetcher<{ donationId: string; paymentStatus: string; refundedCents?: number; netAmountCents?: number; amountCents?: number }>(`/public/donations/checkout-status/${sessionId}`),
    enabled: !!sessionId,
    retry: 3,
    refetchInterval: (query) => query.state.data?.paymentStatus === "pending" ? 5000 : false,
  });
}

// ---------------------------------
// Me API
// ---------------------------------

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => fetcher<User>("/me"),
    retry: false, // Don't retry on 401
  });
}

export function useMyDonations() {
  return useQuery({
    queryKey: ["me", "donations"],
    queryFn: () => fetcher<Donation[]>("/me/donations"),
  });
}

// ---------------------------------
// Admin API
// ---------------------------------

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => fetcher<any>("/admin/dashboard"),
  });
}

export function useAdminActionOptions() {
  return useQuery({
    queryKey: ["admin", "action-options"],
    queryFn: () => fetcher<{ id: string; title: string }[]>("/admin/action-options"),
  });
}

export function useAdminActions() {
  return useQuery({
    queryKey: ["admin", "actions"],
    queryFn: () => fetcher<Action[]>("/admin/actions"),
  });
}

export function useCreateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Action>) =>
      fetcher<Action>("/admin/actions", { method: "POST", json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "actions"] });
    },
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Action> }) =>
      fetcher<Action>(`/admin/actions/${id}`, { method: "PATCH", json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "actions"] });
    },
  });
}

export function useAdminDonations() {
  return useQuery({
    queryKey: ["admin", "donations"],
    queryFn: () => fetcher<Donation[]>("/admin/donations"),
  });
}

export function useAdminExpenses() {
  return useQuery({
    queryKey: ["admin", "expenses"],
    queryFn: () => fetcher<Expense[]>("/admin/expenses"),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { actionId: string, category: string, description: string, amountCents: number, originalReceiptPath?: string, paidAt?: string }) =>
      fetcher<Expense>("/admin/expenses", { method: "POST", json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "expenses"] });
    },
  });
}

export function useReviewExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reviewedReceiptPath: string, publicDescription: string, redactedAttestation: boolean } }) =>
      fetcher<Expense>(`/admin/expenses/${id}/review`, { method: "POST", json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "expenses"] });
    },
  });
}

export function usePublishExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      fetcher<Expense>(`/admin/expenses/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "expenses"] });
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetcher<any[]>("/admin/users"),
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; name?: string; email?: string; role: string }) =>
      fetcher<{ user: any; temporaryPassword: string }>("/admin/users", { method: "POST", json: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      fetcher<any>(`/admin/users/${id}/role`, { method: "PATCH", json: { role } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useRequestUploadUrl() {
  return useMutation({
    mutationFn: (data: { name: string, size: number, contentType: string, purpose: 'original' | 'reviewed', expenseId?: string }) =>
      fetcher<{ uploadURL: string, objectPath: string, metadata: any }>("/admin/storage/uploads/request-url", { method: "POST", json: data }),
  });
}

export function useAdminAuditLogs() {
  return useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: () => fetcher<any[]>("/admin/audit-logs"),
  });
}

// ---------------------------------
// Portal Admin API
// ---------------------------------

export interface PortalBlock {
  type: string;
  id: string;
  [key: string]: any;
}

export interface PortalPage {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  blocks: PortalBlock[];
  version: number;
  publishedAt?: string | null;
  media?: PortalMedia[];
}

export interface PortalMedia {
  id: string;
  altText: string;
  url?: string;
  status?: "pending" | "confirmed";
}

export interface PortalSettings {
  footerInstitutional: string;
  officialLinks: { label: string; href: string }[];
  contact: { email?: string; phone?: string; address?: string };
}

export interface PortalSettingsResponse {
  draft: PortalSettings;
  published: PortalSettings | null;
  version: number;
}

export function useAdminPortalPages() {
  return useQuery({
    queryKey: ["admin", "portal", "pages"],
    queryFn: () => fetcher<PortalPage[]>("/admin/portal/pages"),
  });
}

export function useAdminPortalPage(id: string) {
  return useQuery({
    queryKey: ["admin", "portal", "pages", id],
    queryFn: () => fetcher<PortalPage>(`/admin/portal/pages/${id}`),
    enabled: !!id,
  });
}

export function useCreatePortalPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; title: string; blocks: PortalBlock[] }) =>
      fetcher<PortalPage>("/admin/portal/pages", { method: "POST", json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "portal", "pages"] });
    },
  });
}

export function useUpdatePortalPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { slug: string; title: string; blocks: PortalBlock[]; expectedVersion?: number } }) =>
      fetcher<PortalPage>(`/admin/portal/pages/${id}`, { method: "PATCH", json: data }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "portal", "pages"] });
      queryClient.setQueryData(["admin", "portal", "pages", updated.id], updated);
    },
  });
}

export function usePublishPortalPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }: { id: string; expectedVersion: number }) =>
      fetcher<PortalPage>(`/admin/portal/pages/${id}/publish`, { method: "POST", json: { expectedVersion } }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "portal", "pages"] });
      queryClient.setQueryData(["admin", "portal", "pages", updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ["public", "portal", "pages", updated.slug] });
      queryClient.invalidateQueries({ queryKey: ["public", "portal", "pages"] });
    },
  });
}

export function useUnpublishPortalPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }: { id: string; expectedVersion: number }) =>
      fetcher<PortalPage>(`/admin/portal/pages/${id}/unpublish`, { method: "POST", json: { expectedVersion } }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "portal", "pages"] });
      queryClient.setQueryData(["admin", "portal", "pages", updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ["public", "portal", "pages", updated.slug] });
      queryClient.invalidateQueries({ queryKey: ["public", "portal", "pages"] });
    },
  });
}

export function useAdminPortalSettings() {
  return useQuery({
    queryKey: ["admin", "portal", "settings"],
    queryFn: () => fetcher<PortalSettingsResponse>("/admin/portal/settings"),
  });
}

export function useUpdatePortalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { draft: PortalSettings; expectedVersion: number }) =>
      fetcher<PortalSettingsResponse>("/admin/portal/settings", { method: "PATCH", json: data }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "portal", "settings"], updated);
    },
  });
}

export function usePublishPortalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { expectedVersion: number }) =>
      fetcher<PortalSettingsResponse>("/admin/portal/settings/publish", { method: "POST", json: data }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "portal", "settings"], updated);
      queryClient.invalidateQueries({ queryKey: ["public", "portal", "settings"] });
    },
  });
}

export function useAdminPortalMedia(enabled = true) {
  return useQuery({
    queryKey: ["admin", "portal", "media"],
    queryFn: () => fetcher<PortalMedia[]>("/admin/portal/media"),
    enabled,
  });
}

export function useRequestMediaUploadUrl() {
  return useMutation({
    mutationFn: (data: { name: string; size: number; contentType: string }) =>
      fetcher<{ id: string; uploadURL: string }>("/admin/portal/media/upload-url", { method: "POST", json: data }),
  });
}

export function useConfirmMediaUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, altText }: { id: string; altText: string }) =>
      fetcher<PortalMedia>(`/admin/portal/media/${id}/confirm`, { method: "POST", json: { altText } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "portal", "media"] });
    },
  });
}

// ---------------------------------
// Portal Public API
// ---------------------------------

export function usePublicPortalPage(slug: string) {
  return useQuery({
    queryKey: ["public", "portal", "pages", slug],
    queryFn: () => fetcher<PortalPage>(`/public/portal/pages/${slug}`),
    retry: false, // Don't retry on 404
  });
}

export function usePublicPortalPages() {
  return useQuery({
    queryKey: ["public", "portal", "pages"],
    queryFn: () => fetcher<{ id: string; slug: string; title: string }[]>("/public/portal/pages"),
  });
}

export function usePublicPortalSettings() {
  return useQuery({
    queryKey: ["public", "portal", "settings"],
    queryFn: () => fetcher<PortalSettings>("/public/portal/settings"),
  });
}
