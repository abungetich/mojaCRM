package handlers

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

var errUnknownEntity = errors.New("unknown entity")

// ArchiveHandler lists and recovers soft-deleted records across every
// entity that supports it, ported from propsense. Entities without a
// deleted_at column (e.g. company_documents, which hard-deletes; partner
// requirements/appendix templates, which use an `active` flag instead)
// aren't archivable and are intentionally excluded.
type ArchiveHandler struct{ Deps }

func NewArchiveHandler(d Deps) *ArchiveHandler { return &ArchiveHandler{d} }

// List returns every soft-deleted record across archivable entities (archive:read).
func (h *ArchiveHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	rows, err := h.Store.Queries.ListArchived(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list archive")
		return
	}
	httpx.JSON(w, http.StatusOK, rows)
}

type archiveActionBody struct {
	Entity string `json:"entity"`
	ID     string `json:"id"`
}

// Restore un-deletes a record (archive:write).
func (h *ArchiveHandler) Restore(w http.ResponseWriter, r *http.Request) {
	h.dispatch(w, r, func(tenantID, id uuid.UUID, entity string) error {
		q := h.Store.Queries
		ctx := r.Context()
		switch entity {
		case "client":
			return q.RestoreClient(ctx, db.RestoreClientParams{ID: id, TenantID: tenantID})
		case "partner":
			return q.RestorePartner(ctx, db.RestorePartnerParams{ID: id, TenantID: tenantID})
		case "branch":
			return q.RestoreBranch(ctx, db.RestoreBranchParams{ID: id, TenantID: tenantID})
		case "partner_contact":
			return q.RestorePartnerContact(ctx, db.RestorePartnerContactParams{ID: id, TenantID: tenantID})
		case "office":
			return q.RestoreOffice(ctx, db.RestoreOfficeParams{ID: id, TenantID: tenantID})
		case "department":
			return q.RestoreDepartment(ctx, db.RestoreDepartmentParams{ID: id, TenantID: tenantID})
		case "tender":
			return q.RestoreTender(ctx, db.RestoreTenderParams{ID: id, TenantID: tenantID})
		}
		return errUnknownEntity
	})
}

// Purge permanently deletes a record (archive:write).
func (h *ArchiveHandler) Purge(w http.ResponseWriter, r *http.Request) {
	h.dispatch(w, r, func(tenantID, id uuid.UUID, entity string) error {
		q := h.Store.Queries
		ctx := r.Context()
		switch entity {
		case "client":
			return q.PurgeClient(ctx, db.PurgeClientParams{ID: id, TenantID: tenantID})
		case "partner":
			return q.PurgePartner(ctx, db.PurgePartnerParams{ID: id, TenantID: tenantID})
		case "branch":
			return q.PurgeBranch(ctx, db.PurgeBranchParams{ID: id, TenantID: tenantID})
		case "partner_contact":
			return q.PurgePartnerContact(ctx, db.PurgePartnerContactParams{ID: id, TenantID: tenantID})
		case "office":
			return q.PurgeOffice(ctx, db.PurgeOfficeParams{ID: id, TenantID: tenantID})
		case "department":
			return q.PurgeDepartment(ctx, db.PurgeDepartmentParams{ID: id, TenantID: tenantID})
		case "tender":
			return q.PurgeTender(ctx, db.PurgeTenderParams{ID: id, TenantID: tenantID})
		}
		return errUnknownEntity
	})
}

func (h *ArchiveHandler) dispatch(w http.ResponseWriter, r *http.Request, run func(tenantID, id uuid.UUID, entity string) error) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body archiveActionBody
	if err := httpx.Decode(r, &body); err != nil || body.Entity == "" {
		httpx.Error(w, http.StatusBadRequest, "entity and id are required")
		return
	}
	id, err := uuid.Parse(body.ID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := run(tenantID, id, body.Entity); err != nil {
		if err == errUnknownEntity {
			httpx.Error(w, http.StatusBadRequest, "unknown entity type")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "action failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
