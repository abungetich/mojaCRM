package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

// DepartmentHandler manages departments and their membership, ported from propsense.
type DepartmentHandler struct{ Deps }

func NewDepartmentHandler(d Deps) *DepartmentHandler { return &DepartmentHandler{d} }

type DepartmentView struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	HeadUserID    *string   `json:"head_user_id,omitempty"`
	HeadUserName  string    `json:"head_user_name"`
	MemberCount   int64     `json:"member_count"`
	CreatedAt     time.Time `json:"created_at"`
	CreatedByName string    `json:"created_by_name"`
}

func departmentHeadID(id pgtype.UUID) *string {
	if !id.Valid {
		return nil
	}
	s := uuid.UUID(id.Bytes).String()
	return &s
}

func departmentListView(r db.ListDepartmentsRow) DepartmentView {
	name := ""
	if r.HeadUserName != nil {
		name = *r.HeadUserName
	}
	return DepartmentView{
		ID: r.ID, Name: r.Name, Description: r.Description, HeadUserID: departmentHeadID(r.HeadUserID),
		HeadUserName: name, MemberCount: r.MemberCount, CreatedAt: r.CreatedAt, CreatedByName: r.CreatedByName,
	}
}

func departmentGetView(r db.GetDepartmentRow) DepartmentView {
	name := ""
	if r.HeadUserName != nil {
		name = *r.HeadUserName
	}
	return DepartmentView{
		ID: r.ID, Name: r.Name, Description: r.Description, HeadUserID: departmentHeadID(r.HeadUserID),
		HeadUserName: name, MemberCount: r.MemberCount, CreatedAt: r.CreatedAt, CreatedByName: r.CreatedByName,
	}
}

func departmentView(d db.Department) DepartmentView {
	return DepartmentView{
		ID: d.ID, Name: d.Name, Description: d.Description, HeadUserID: departmentHeadID(d.HeadUserID),
		CreatedAt: d.CreatedAt, CreatedByName: d.CreatedByName,
	}
}

// List returns all departments (departments:read).
func (h *DepartmentHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	rows, err := h.Store.Queries.ListDepartments(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list departments")
		return
	}
	out := make([]DepartmentView, 0, len(rows))
	for _, row := range rows {
		out = append(out, departmentListView(row))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// Get returns a single department (departments:read).
func (h *DepartmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	row, err := h.Store.Queries.GetDepartment(r.Context(), db.GetDepartmentParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "department not found")
		return
	}
	httpx.JSON(w, http.StatusOK, departmentGetView(row))
}

type departmentBody struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	HeadUserID  *string `json:"head_user_id"`
}

func (b departmentBody) headUserID() (pgtype.UUID, bool) {
	return parseOptionalUUID(derefString(b.HeadUserID))
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// Create adds a department (departments:write).
func (h *DepartmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body departmentBody
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	headID, ok := body.headUserID()
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid head_user_id")
		return
	}
	d, err := h.Store.Queries.CreateDepartment(r.Context(), db.CreateDepartmentParams{
		TenantID: tenantID, Name: body.Name, Description: body.Description, HeadUserID: headID,
		CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create department")
		return
	}
	httpx.JSON(w, http.StatusCreated, departmentView(d))
}

// Update edits a department (departments:write).
func (h *DepartmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body departmentBody
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	headID, ok := body.headUserID()
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid head_user_id")
		return
	}
	d, err := h.Store.Queries.UpdateDepartment(r.Context(), db.UpdateDepartmentParams{
		ID: id, TenantID: tenantID, Name: body.Name, Description: body.Description, HeadUserID: headID,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "department not found")
		return
	}
	httpx.JSON(w, http.StatusOK, departmentView(d))
}

// Delete soft-deletes a department (departments:write).
func (h *DepartmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.Store.Queries.DeleteDepartment(r.Context(), db.DeleteDepartmentParams{
		ID: id, TenantID: tenantID, DeletedByName: actorName(r.Context(), h.Store), DeleteReason: deleteReason(r),
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete department")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ListMembers lists a department's members (departments:read).
func (h *DepartmentHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	rows, err := h.Store.Queries.ListDepartmentMembers(r.Context(), id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list members")
		return
	}
	httpx.JSON(w, http.StatusOK, rows)
}

// AddMember adds a user to a department (departments:write).
func (h *DepartmentHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	deptID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid department id")
		return
	}
	var body struct {
		UserID string `json:"user_id"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	userID, err := uuid.Parse(body.UserID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid user_id")
		return
	}
	if err := h.Store.Queries.AddDepartmentMember(r.Context(), db.AddDepartmentMemberParams{
		TenantID: tenantID, DepartmentID: deptID, UserID: userID,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not add member")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// RemoveMember removes a user from a department (departments:write).
func (h *DepartmentHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	deptID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid department id")
		return
	}
	userID, err := uuid.Parse(chi.URLParam(r, "userId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	if err := h.Store.Queries.RemoveDepartmentMember(r.Context(), db.RemoveDepartmentMemberParams{
		DepartmentID: deptID, UserID: userID,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not remove member")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
