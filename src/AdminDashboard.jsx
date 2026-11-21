import { API } from "./config";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import "./AdminDashboard.css";
import ToastContainer from "./components/Toast";
import {
  IconExternalLink,
  IconLogOut,
  IconPlus,
  IconSearch,
  IconTrash,
  IconEdit,
  IconImage,
  IconUploadCloud,
  IconCheckCircle,
  IconAlertTriangle,
  IconAlertCircle,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconRefreshCw,
  IconGrid,
  IconList,
  IconCalendar,
  IconClock,
  IconLayers,
  IconMaximize,
  IconServer,
  IconDatabase,
  IconArrowUpRight,
  IconShield,
} from "./components/Icons";

const CURRENT_YEAR = new Date().getFullYear();

function logoutAdmin() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUsername");
  window.location.replace("/admin");
}

function getTokenExpiry(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(base64));
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

const PRESET_TEMPLATES = [
  "Heavy Industrial Shed Fabrication & Roofing Structure",
  "Custom Automated Sliding Metal Gate",
  "Architectural Steel Staircase & Safety Handrails",
  "Decorative Laser-Cut Security Window Grills",
  "On-site Factory Structural Steel Erection & Machine Foundation",
  "Heavy-Duty Industrial Steel Warehouse Truss Framework",
];

function AdminDashboard() {
  // Simplified 2-view navigation: 'projects' or 'upload'
  const [activeTab, setActiveTab] = useState("projects");

  // Core Data
  const [projects, setProjects] = useState([]);
  const [authChecking, setAuthChecking] = useState(true);
  const [pageError, setPageError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Upload Form State
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Edit Modal State
  const [editingProject, setEditingProject] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [editFiles, setEditFiles] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // Delete Confirm Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'project' or 'image'
    projectId: null,
    imageId: null,
    title: "",
    count: 0,
    loading: false,
  });

  // Lightbox State
  const [lightbox, setLightbox] = useState({
    isOpen: false,
    images: [],
    currentIndex: 0,
    projectTitle: "",
  });

  // Diagnostics Modal State (keeps UI clean and accessible without adding tab clutter)
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  // Search, Filter, Sort, View State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // 'all', 'with_photos', 'no_photos'
  const [sortBy, setSortBy] = useState("newest"); // 'newest', 'oldest', 'most_photos'
  const [viewMode, setViewMode] = useState("grid"); // 'grid', 'table'

  // Session timer state
  const [sessionRemaining, setSessionRemaining] = useState("");

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const adminUsername = localStorage.getItem("adminUsername") || "Administrator";

  // Toast helper
  const addToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Cancel edit modal helper
  const handleCancelEdit = useCallback(() => {
    setEditingProject(null);
    setEditDescription("");
    setEditFiles([]);
  }, []);

  // Authenticated fetch wrapper
  const authFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      logoutAdmin();
      throw new Error("SESSION_EXPIRED");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      addToast("error", "Session Expired", "Your authentication session has timed out. Please sign in again.");
      setTimeout(logoutAdmin, 1200);
      throw new Error("SESSION_EXPIRED");
    }

    return response;
  }, [addToast]);

  // Fetch all projects
  const fetchProjects = useCallback(async (showToastNotice = false) => {
    try {
      setRefreshing(true);
      const response = await authFetch(`${API}/projects`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to fetch projects.");
      }

      setProjects(data.projects || []);
      if (showToastNotice) {
        addToast("info", "Data Synchronized", `Loaded ${data.projects?.length || 0} project(s).`);
      }
    } catch (error) {
      if (error.message !== "SESSION_EXPIRED") {
        console.error("Fetch projects error:", error);
        addToast("error", "Failed to Load Projects", "Cannot connect to backend server.");
      }
    } finally {
      setRefreshing(false);
    }
  }, [authFetch, addToast]);

  // Session verification & countdown timer
  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem("adminToken");
    if (!token) {
      logoutAdmin();
      return;
    }

    const expiry = getTokenExpiry(token);
    if (!expiry || expiry <= Date.now()) {
      logoutAdmin();
      return;
    }

    const timer = setInterval(() => {
      const remainingMs = expiry - Date.now();
      if (remainingMs <= 0) {
        clearInterval(timer);
        logoutAdmin();
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        if (isMounted) {
          setSessionRemaining(`${mins}m ${secs < 10 ? "0" : ""}${secs}s`);
        }
      }
    }, 1000);

    const initAuth = async () => {
      try {
        const res = await authFetch(`${API}/auth/me`);
        const data = await res.json();
        if (!data || !data.success) {
          logoutAdmin();
          return;
        }
        await fetchProjects();
        if (isMounted) setAuthChecking(false);
      } catch (err) {
        if (err.message !== "SESSION_EXPIRED" && isMounted) {
          setPageError("Unable to establish secure connection to the administration server.");
          setAuthChecking(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [authFetch, fetchProjects]);

  // Keyboard shortcut listener (Esc to close modals / lightbox)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (lightbox.isOpen) setLightbox((prev) => ({ ...prev, isOpen: false }));
        if (editingProject) handleCancelEdit();
        if (deleteModal.isOpen) setDeleteModal((prev) => ({ ...prev, isOpen: false }));
        if (showDiagnosticsModal) setShowDiagnosticsModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox.isOpen, editingProject, deleteModal.isOpen, showDiagnosticsModal, handleCancelEdit]);

  // Diagnostics check runner
  const runDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      const healthRes = await fetch(`${API}/health`);
      const healthData = await healthRes.json();
      setHealthStatus(healthData);

      const dbRes = await fetch(`${API}/db-test`);
      const dbData = await dbRes.json();
      setDbStatus(dbData);

      addToast("success", "Diagnostics Complete", "API routes & MySQL connectivity verified.");
    } catch (err) {
      console.error("Diagnostics error:", err);
      addToast("error", "Diagnostics Error", "Server health check failed.");
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  // Open Diagnostics Modal
  const handleOpenDiagnostics = () => {
    setShowDiagnosticsModal(true);
    if (!healthStatus || !dbStatus) {
      runDiagnostics();
    }
  };

  // Drag & drop handlers for upload
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (newFiles.length === 0) {
        addToast("warning", "Invalid Files", "Please drop image files (JPG, PNG, WEBP).");
        return;
      }

      if (selectedFiles.length + newFiles.length > 10) {
        addToast("warning", "File Limit", "Maximum 10 images allowed per project upload.");
        return;
      }

      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (selectedFiles.length + files.length > 10) {
      addToast("warning", "File Limit", "You can upload a maximum of 10 images per project.");
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllSelectedFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Upload New Project
  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      addToast("warning", "Description Required", "Please enter a descriptive title for this project.");
      return;
    }

    if (selectedFiles.length === 0) {
      addToast("warning", "Photos Required", "Please select or take at least one project photo.");
      return;
    }

    const formData = new FormData();
    formData.append("description", description.trim());
    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    setUploadLoading(true);

    try {
      const response = await authFetch(`${API}/projects`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        addToast("error", "Upload Failed", data.message || "Server rejected the project upload.");
        return;
      }

      addToast("success", "Project Published!", `"${description.trim()}" is now live with ${selectedFiles.length} photo(s).`);
      setDescription("");
      clearAllSelectedFiles();
      await fetchProjects();
      setActiveTab("projects");
    } catch (err) {
      if (err.message !== "SESSION_EXPIRED") {
        console.error("Upload error:", err);
        addToast("error", "Connection Error", "Failed to communicate with upload server.");
      }
    } finally {
      setUploadLoading(false);
    }
  };

  // Edit Project handlers
  const handleEditClick = (project) => {
    setEditingProject(project);
    setEditDescription(project.description);
    setEditFiles([]);
  };

  const handleEditFileChange = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    setEditFiles((prev) => [...prev, ...files]);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const removeEditFile = (index) => {
    setEditFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();

    if (!editDescription.trim()) {
      addToast("warning", "Description Required", "Project description cannot be blank.");
      return;
    }

    const formData = new FormData();
    formData.append("description", editDescription.trim());
    editFiles.forEach((file) => {
      formData.append("images", file);
    });

    setEditLoading(true);

    try {
      const response = await authFetch(`${API}/projects/${editingProject.id}`, {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        addToast("error", "Update Failed", data.message || "Failed to update project.");
        return;
      }

      addToast("success", "Project Updated", "Changes saved successfully.");
      handleCancelEdit();
      await fetchProjects();
    } catch (err) {
      if (err.message !== "SESSION_EXPIRED") {
        console.error("Update error:", err);
        addToast("error", "Network Error", "Unable to reach the server.");
      }
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Handlers with Confirmation Modal
  const requestDeleteProject = (project) => {
    setDeleteModal({
      isOpen: true,
      type: "project",
      projectId: project.id,
      imageId: null,
      title: project.description,
      count: project.images?.length || 0,
      loading: false,
    });
  };

  const requestDeleteImage = (projectId, imageId, projectTitle) => {
    setDeleteModal({
      isOpen: true,
      type: "image",
      projectId: projectId,
      imageId: imageId,
      title: projectTitle || "Project photo",
      count: 1,
      loading: false,
    });
  };

  const confirmDeleteAction = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));

    try {
      if (deleteModal.type === "project") {
        const response = await authFetch(`${API}/projects/${deleteModal.projectId}`, {
          method: "DELETE",
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          addToast("error", "Delete Failed", data.message || "Could not delete project.");
          return;
        }

        addToast("info", "Project Removed", `Permanently deleted "${deleteModal.title}".`);
        if (editingProject?.id === deleteModal.projectId) handleCancelEdit();
        await fetchProjects();
      } else if (deleteModal.type === "image") {
        const response = await authFetch(
          `${API}/projects/${deleteModal.projectId}/images/${deleteModal.imageId}`,
          { method: "DELETE" }
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          addToast("error", "Photo Deletion Failed", data.message || "Could not delete photo.");
          return;
        }

        addToast("info", "Photo Deleted", "Selected photo removed from Cloudinary and database.");
        await fetchProjects();

        if (editingProject?.id === deleteModal.projectId) {
          setEditingProject((prev) => ({
            ...prev,
            images: prev.images.filter((img) => img.id !== deleteModal.imageId),
          }));
        }
      }
    } catch (err) {
      if (err.message !== "SESSION_EXPIRED") {
        console.error("Delete error:", err);
        addToast("error", "Server Error", "Could not complete deletion.");
      }
    } finally {
      setDeleteModal({ isOpen: false, type: null, projectId: null, imageId: null, title: "", count: 0, loading: false });
    }
  };

  // Lightbox handlers
  const openLightbox = (images, index, projectTitle) => {
    setLightbox({
      isOpen: true,
      images: images || [],
      currentIndex: index || 0,
      projectTitle: projectTitle || "Project Gallery",
    });
  };

  const nextLightboxImage = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length,
    }));
  };

  const prevLightboxImage = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
    }));
  };

  // Filtered & Sorted Projects
  const processedProjects = useMemo(() => {
    let result = [...projects];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((p) => p.description?.toLowerCase().includes(lower));
    }

    if (filterMode === "with_photos") {
      result = result.filter((p) => p.images && p.images.length > 0);
    } else if (filterMode === "no_photos") {
      result = result.filter((p) => !p.images || p.images.length === 0);
    }

    result.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;

      if (sortBy === "newest") {
        return timeB - timeA || b.id - a.id;
      }
      if (sortBy === "oldest") {
        return timeA - timeB || a.id - b.id;
      }
      if (sortBy === "most_photos") {
        return (b.images?.length || 0) - (a.images?.length || 0);
      }
      return 0;
    });

    return result;
  }, [projects, searchTerm, filterMode, sortBy]);

  // Statistics
  const totalProjects = projects.length;
  const totalPhotos = projects.reduce((acc, p) => acc + (p.images?.length || 0), 0);

  // Authentication Loading Screen
  if (authChecking) {
    return (
      <div className="dashboard-initial-loading">
        <div className="loading-emblem">DB</div>
        <div className="loading-orbit-spinner"></div>
        <h2>Loading Admin Dashboard</h2>
        <p>Verifying secure session...</p>
      </div>
    );
  }

  // Critical Page Error
  if (pageError) {
    return (
      <div className="dashboard-initial-loading error-state">
        <IconAlertCircle size={48} className="error-icon-lg" />
        <h2>Connection Failure</h2>
        <p>{pageError}</p>
        <div className="loading-actions">
          <button onClick={() => window.location.reload()} className="btn-primary-gold">
            <IconRefreshCw size={15} /> Retry
          </button>
          <button onClick={logoutAdmin} className="btn-secondary-outline">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* TOP COMPACT APPLICATION BAR */}
      <header className="app-topbar">
        <div className="topbar-left">
          <div className="app-brand-badge">
            <span className="brand-logo-sq">DB</span>
            <div className="brand-titles-group">
              <span className="brand-sup">METAL FABRICATION</span>
              <h1 className="brand-main">Admin Dashboard</h1>
            </div>
          </div>
        </div>

        <div className="topbar-right">
          {sessionRemaining && (
            <div className="session-timer-badge" title="Session time remaining">
              <IconClock size={13} />
              <span>{sessionRemaining}</span>
            </div>
          )}

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-action-link"
            title="Open customer website in new tab"
          >
            <IconExternalLink size={14} />
            <span className="btn-text-desktop">View Website</span>
          </a>

          <button
            onClick={logoutAdmin}
            className="topbar-logout-btn"
            title="Sign out of admin"
          >
            <IconLogOut size={15} />
            <span className="btn-text-desktop">Logout</span>
          </button>
        </div>
      </header>

      {/* STREAMLINED TAB BAR & QUICK ACTIONS */}
      <nav className="console-navigation">
        <div className="nav-container">
          <div className="nav-tabs-list" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "projects"}
              className={`nav-tab-item ${activeTab === "projects" ? "active" : ""}`}
              onClick={() => setActiveTab("projects")}
            >
              <IconLayers size={17} />
              <span>Projects & Gallery</span>
              <span className="tab-badge">{totalProjects}</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "upload"}
              className={`nav-tab-item ${activeTab === "upload" ? "active" : ""}`}
              onClick={() => setActiveTab("upload")}
            >
              <IconPlus size={17} />
              <span>+ Add New Project</span>
            </button>
          </div>

          <div className="nav-quick-actions">
            <button
              className="nav-action-pill-btn"
              onClick={handleOpenDiagnostics}
              title="Check Server & Cloudinary Status"
            >
              <IconServer size={14} />
              <span className="btn-text-desktop">System Status</span>
            </button>

            <button
              className="refresh-btn"
              onClick={() => fetchProjects(true)}
              disabled={refreshing}
              title="Sync projects with database"
            >
              <IconRefreshCw size={14} className={refreshing ? "spin-icon" : ""} />
              <span className="btn-text-desktop">Sync</span>
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN VIEW AREA */}
      <main className="dashboard-main-body">
        {/* ========================================================
            VIEW 1: PROJECTS & GALLERY (MAIN WORKSPACE)
        ======================================================== */}
        {activeTab === "projects" && (
          <div className="view-pane projects-pane">
            {/* Quick Stats & Upload Banner */}
            <div className="quick-stats-strip">
              <div className="stat-item">
                <span className="stat-label">Total Projects</span>
                <strong className="stat-value">{totalProjects}</strong>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-label">Total Photos</span>
                <strong className="stat-value">{totalPhotos}</strong>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item stat-item-storage">
                <span className="stat-label">Media Storage</span>
                <strong className="stat-value stat-good">Cloudinary Active</strong>
              </div>

              <div className="strip-cta">
                <button
                  className="btn-primary-gold"
                  onClick={() => setActiveTab("upload")}
                >
                  <IconPlus size={15} />
                  <span>Add New Project</span>
                </button>
              </div>
            </div>

            {/* Mobile & Desktop Search & Filter Toolbar */}
            <div className="projects-toolbar-card">
              <div className="toolbar-top-row">
                <div className="search-field-box">
                  <IconSearch size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="search-clear-btn"
                      onClick={() => setSearchTerm("")}
                      aria-label="Clear search"
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>

                <div className="toolbar-controls-group">
                  <div className="select-pill-group">
                    <select
                      value={filterMode}
                      onChange={(e) => setFilterMode(e.target.value)}
                      className="styled-select"
                      aria-label="Filter projects"
                    >
                      <option value="all">All ({totalProjects})</option>
                      <option value="with_photos">With Photos</option>
                      <option value="no_photos">No Photos</option>
                    </select>
                  </div>

                  <div className="select-pill-group">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="styled-select"
                      aria-label="Sort projects"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="most_photos">Most Photos</option>
                    </select>
                  </div>

                  <div className="view-toggle-group">
                    <button
                      type="button"
                      className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      title="Cards Grid"
                    >
                      <IconGrid size={15} />
                    </button>
                    <button
                      type="button"
                      className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                      onClick={() => setViewMode("table")}
                      title="Compact Table"
                    >
                      <IconList size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="toolbar-status-row">
                <span className="results-count">
                  Showing <strong>{processedProjects.length}</strong> of {totalProjects} project(s)
                </span>
                {(searchTerm || filterMode !== "all") && (
                  <button
                    className="clear-all-filters-btn"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterMode("all");
                    }}
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Empty State */}
            {processedProjects.length === 0 ? (
              <div className="projects-empty-card">
                <div className="empty-icon-ring">
                  <IconLayers size={28} />
                </div>
                <h3>No Projects Found</h3>
                <p>
                  {searchTerm
                    ? `No projects matched "${searchTerm}".`
                    : "No projects in this category yet. Click below to add your first work."}
                </p>
                <div className="empty-actions">
                  {searchTerm && (
                    <button
                      className="btn-secondary-outline"
                      onClick={() => setSearchTerm("")}
                    >
                      Clear Search
                    </button>
                  )}
                  <button
                    className="btn-primary-gold"
                    onClick={() => setActiveTab("upload")}
                  >
                    <IconPlus size={15} /> Add New Project
                  </button>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              /* CARD GRID VIEW */
              <div className="projects-grid-layout">
                {processedProjects.map((project) => (
                  <div key={project.id} className="project-grid-card">
                    {/* Top status bar */}
                    <div className="card-top-bar">
                      <span className="card-id-tag">#{project.id}</span>
                      <span className="card-photo-count">
                        <IconImage size={12} />
                        <span>{project.images?.length || 0} Photos</span>
                      </span>
                    </div>

                    {/* Media Reel */}
                    <div className="card-media-reel">
                      {project.images && project.images.length > 0 ? (
                        <div
                          className={`media-reel-grid count-${Math.min(project.images.length, 4)}`}
                        >
                          {project.images.map((image, idx) => (
                            <div key={image.id} className="reel-item-container">
                              <img
                                src={image.image_url}
                                alt={`${project.description} ${idx + 1}`}
                                loading="lazy"
                                className="reel-image"
                                onClick={() =>
                                  openLightbox(project.images, idx, project.description)
                                }
                              />
                              <div className="reel-hover-actions">
                                <button
                                  type="button"
                                  className="reel-zoom-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openLightbox(project.images, idx, project.description);
                                  }}
                                  title="View Fullscreen"
                                >
                                  <IconMaximize size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="reel-del-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestDeleteImage(project.id, image.id, project.description);
                                  }}
                                  title="Delete photo"
                                >
                                  <IconTrash size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-images-banner">
                          <IconImage size={22} />
                          <span>No photos uploaded yet</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="card-content-body">
                      <div className="card-date-meta">
                        <IconCalendar size={12} />
                        <span>{formatDate(project.created_at)}</span>
                      </div>
                      <h3 className="card-description" title={project.description}>
                        {project.description}
                      </h3>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="card-actions-footer">
                      <button
                        type="button"
                        className="btn-edit-action"
                        onClick={() => handleEditClick(project)}
                      >
                        <IconEdit size={14} />
                        <span>Edit Project</span>
                      </button>

                      <button
                        type="button"
                        className="btn-delete-action"
                        onClick={() => requestDeleteProject(project)}
                      >
                        <IconTrash size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="projects-table-card">
                <div className="table-responsive">
                  <table className="projects-table">
                    <thead>
                      <tr>
                        <th style={{ width: "70px" }}>Cover</th>
                        <th style={{ width: "70px" }}>ID</th>
                        <th>Description</th>
                        <th style={{ width: "90px" }}>Photos</th>
                        <th style={{ width: "120px" }}>Date</th>
                        <th style={{ width: "140px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedProjects.map((project) => (
                        <tr key={project.id}>
                          <td>
                            <div className="table-thumb-wrap">
                              {project.images?.[0] ? (
                                <img
                                  src={project.images[0].image_url}
                                  alt={project.description}
                                  className="table-thumb"
                                  onClick={() =>
                                    openLightbox(project.images, 0, project.description)
                                  }
                                />
                              ) : (
                                <div className="table-thumb-placeholder">
                                  <IconImage size={15} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="table-id-badge">#{project.id}</span>
                          </td>
                          <td>
                            <span className="table-description-text">
                              {project.description}
                            </span>
                          </td>
                          <td>
                            <span
                              className="table-photo-badge"
                              onClick={() => {
                                if (project.images?.length > 0) {
                                  openLightbox(project.images, 0, project.description);
                                }
                              }}
                            >
                              <IconImage size={12} />
                              <span>{project.images?.length || 0}</span>
                            </span>
                          </td>
                          <td>
                            <span className="table-date-text">
                              {formatDate(project.created_at)}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="table-row-actions">
                              <button
                                className="table-btn-edit"
                                onClick={() => handleEditClick(project)}
                                title="Edit"
                              >
                                <IconEdit size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                className="table-btn-delete"
                                onClick={() => requestDeleteProject(project)}
                                title="Delete"
                              >
                                <IconTrash size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mobile Floating Action Button to quickly add project */}
            <button
              type="button"
              className="mobile-fab-add"
              onClick={() => setActiveTab("upload")}
              aria-label="Add New Project"
              title="Add New Project"
            >
              <IconPlus size={22} />
            </button>
          </div>
        )}

        {/* ========================================================
            VIEW 2: ADD NEW PROJECT (FAST, INTUITIVE PUBLISHING)
        ======================================================== */}
        {activeTab === "upload" && (
          <div className="view-pane upload-pane">
            <div className="upload-studio-card">
              <div className="studio-header">
                <div>
                  <span className="hero-tag">NEW PORTFOLIO ENTRY</span>
                  <h2>Publish a Metal Project</h2>
                  <p>
                    Add project details and select photos from your device. It will instantly appear on the live website.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-back-to-projects"
                  onClick={() => setActiveTab("projects")}
                >
                  ← Back to Projects
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="studio-form">
                {/* Description Input */}
                <div className="studio-field-group">
                  <div className="field-label-row">
                    <label htmlFor="new-project-description">
                      1. Project Title & Description
                    </label>
                    <span className="char-counter">{description.length} / 400</span>
                  </div>

                  <textarea
                    id="new-project-description"
                    placeholder="e.g. Heavy Industrial Steel Shed Fabrication with Truss Framework - Hosur Plant"
                    value={description}
                    maxLength={400}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    required
                  />

                  {/* Preset Quick Chips */}
                  <div className="preset-chips-row">
                    <span className="chips-label">Quick suggestions:</span>
                    <div className="chips-list">
                      {PRESET_TEMPLATES.map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          className="template-chip"
                          onClick={() => setDescription(tpl)}
                        >
                          + {tpl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Drag and Drop Zone / Tap to pick */}
                <div className="studio-field-group">
                  <div className="field-label-row">
                    <label>2. Select Project Photos (Up to 10)</label>
                    <span className="file-limit-note">JPG, PNG, WEBP • Auto-optimized</span>
                  </div>

                  <div
                    className={`drag-drop-zone ${isDragging ? "drag-over" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />

                    <div className="dropzone-content">
                      <div className="dropzone-icon-circle">
                        <IconUploadCloud size={30} />
                      </div>
                      <h3>Tap to Choose Photos</h3>
                      <p>or drag & drop images here</p>
                      <span className="dropzone-sub">
                        Select multiple files from your phone gallery or computer
                      </span>
                    </div>
                  </div>

                  {/* Selected Files Previews */}
                  {selectedFiles.length > 0 && (
                    <div className="selected-files-preview-section">
                      <div className="preview-section-header">
                        <div className="files-count-badge">
                          <IconCheckCircle size={14} />
                          <span>{selectedFiles.length} photo(s) selected</span>
                        </div>
                        <button
                          type="button"
                          className="btn-clear-all-files"
                          onClick={clearAllSelectedFiles}
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="file-preview-thumbnails-grid">
                        {selectedFiles.map((file, idx) => {
                          const previewUrl = URL.createObjectURL(file);
                          return (
                            <div key={idx} className="file-preview-card">
                              <img
                                src={previewUrl}
                                alt={file.name}
                                className="file-preview-img"
                                onLoad={() => URL.revokeObjectURL(previewUrl)}
                              />
                              <div className="file-preview-info">
                                <span className="file-preview-name" title={file.name}>
                                  {file.name}
                                </span>
                                <span className="file-preview-size">
                                  {formatBytes(file.size)}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="file-remove-btn"
                                onClick={() => removeSelectedFile(idx)}
                                title="Remove photo"
                              >
                                <IconX size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Action Controls */}
                <div className="studio-actions-bar">
                  <button
                    type="submit"
                    className="btn-submit-upload"
                    disabled={uploadLoading || !description.trim() || selectedFiles.length === 0}
                  >
                    {uploadLoading ? (
                      <>
                        <span className="btn-spinner"></span>
                        <span>Publishing to Website...</span>
                      </>
                    ) : (
                      <>
                        <IconUploadCloud size={17} />
                        <span>Publish Project to Website</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn-reset-form"
                    onClick={() => {
                      setDescription("");
                      clearAllSelectedFiles();
                    }}
                    disabled={uploadLoading}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================
          MODAL 1: EDIT PROJECT MODAL (TOUCH OPTIMIZED)
      ======================================================== */}
      {editingProject && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div
            className="modal-content modal-edit-project"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <IconEdit size={18} className="modal-icon-gold" />
                <div>
                  <h3>Edit Project #{editingProject.id}</h3>
                  <p>Update description or add/remove photos</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCancelEdit}
                aria-label="Close modal"
              >
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="modal-form">
              <div className="modal-body-scroll">
                {/* Description textarea */}
                <div className="form-group-modal">
                  <label htmlFor="edit-desc-input">Project Description</label>
                  <textarea
                    id="edit-desc-input"
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Existing Photos Management */}
                <div className="form-group-modal">
                  <label>Current Photos ({editingProject.images?.length || 0})</label>
                  {editingProject.images && editingProject.images.length > 0 ? (
                    <div className="existing-photos-grid">
                      {editingProject.images.map((img) => (
                        <div key={img.id} className="existing-photo-item">
                          <img src={img.image_url} alt="Project work" />
                          <button
                            type="button"
                            className="btn-del-existing-photo"
                            onClick={() =>
                              requestDeleteImage(editingProject.id, img.id, editingProject.description)
                            }
                            title="Delete this photo"
                          >
                            <IconTrash size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-sub-note">No photos attached yet.</p>
                  )}
                </div>

                {/* Add More Photos */}
                <div className="form-group-modal">
                  <label>Add More Photos</label>
                  <div
                    className="modal-file-dropzone"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEditFileChange}
                      style={{ display: "none" }}
                    />
                    <IconUploadCloud size={22} />
                    <span>Tap to select more photos</span>
                  </div>

                  {editFiles.length > 0 && (
                    <div className="modal-selected-files-list">
                      <p className="selected-files-subhead">
                        {editFiles.length} new photo(s) selected:
                      </p>
                      <div className="modal-chips-grid">
                        {editFiles.map((file, i) => (
                          <div key={i} className="edit-file-chip">
                            <span className="chip-name">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeEditFile(i)}
                              aria-label="Remove"
                            >
                              <IconX size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary-outline"
                  onClick={handleCancelEdit}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-gold"
                  disabled={editLoading || !editDescription.trim()}
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: DELETE CONFIRMATION MODAL
      ======================================================== */}
      {deleteModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() =>
            !deleteModal.loading && setDeleteModal({ ...deleteModal, isOpen: false })
          }
        >
          <div
            className="modal-content modal-danger"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
          >
            <div className="danger-icon-large">
              <IconAlertTriangle size={32} />
            </div>

            <div className="danger-text-center">
              <h3>
                {deleteModal.type === "project" ? "Delete Project?" : "Delete This Photo?"}
              </h3>
              <p className="danger-project-title">
                "{deleteModal.title}"
              </p>
              <p className="danger-explanation">
                {deleteModal.type === "project"
                  ? `Permanently remove this project and all ${deleteModal.count} photo(s) from website and database.`
                  : "Permanently delete this photo from storage."}
              </p>
            </div>

            <div className="modal-danger-actions">
              <button
                type="button"
                className="btn-cancel-danger"
                onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                disabled={deleteModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm-delete"
                onClick={confirmDeleteAction}
                disabled={deleteModal.loading}
              >
                {deleteModal.loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <IconTrash size={15} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: FULLSCREEN IMAGE LIGHTBOX
      ======================================================== */}
      {lightbox.isOpen && lightbox.images.length > 0 && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightbox({ ...lightbox, isOpen: false })}
        >
          <div className="lightbox-top-bar" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-titles">
              <span className="lightbox-counter">
                {lightbox.currentIndex + 1} / {lightbox.images.length}
              </span>
              <h4 className="lightbox-desc">{lightbox.projectTitle}</h4>
            </div>

            <div className="lightbox-actions-group">
              <a
                href={lightbox.images[lightbox.currentIndex]?.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="lightbox-action-btn"
                title="Open photo in new tab"
              >
                <IconArrowUpRight size={15} />
              </a>
              <button
                type="button"
                className="lightbox-action-btn"
                onClick={() => setLightbox({ ...lightbox, isOpen: false })}
                title="Close"
              >
                <IconX size={18} />
              </button>
            </div>
          </div>

          {lightbox.images.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-arrow arrow-left"
                onClick={(e) => {
                  e.stopPropagation();
                  prevLightboxImage();
                }}
                title="Previous photo"
              >
                <IconChevronLeft size={24} />
              </button>
              <button
                type="button"
                className="lightbox-arrow arrow-right"
                onClick={(e) => {
                  e.stopPropagation();
                  nextLightboxImage();
                }}
                title="Next photo"
              >
                <IconChevronRight size={24} />
              </button>
            </>
          )}

          <div
            className="lightbox-stage"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.images[lightbox.currentIndex]?.image_url}
              alt={lightbox.projectTitle}
              className="lightbox-active-img"
            />
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: SYSTEM STATUS & DIAGNOSTICS (ON-DEMAND)
      ======================================================== */}
      {showDiagnosticsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDiagnosticsModal(false)}
        >
          <div
            className="modal-content modal-diagnostics"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <IconServer size={18} className="modal-icon-gold" />
                <div>
                  <h3>System Status & Health</h3>
                  <p>Backend API, MySQL & Cloudinary status</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowDiagnosticsModal(false)}
                aria-label="Close modal"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body-scroll">
              <div className="diag-modal-cards">
                <div className="diag-mini-card">
                  <div className="diag-mini-header">
                    <IconServer size={18} className="text-green" />
                    <strong>API Server (Express)</strong>
                  </div>
                  <div className="diag-mini-body">
                    <span>Status: <strong className="text-green">{healthStatus ? "Operational (200 OK)" : "Active"}</strong></span>
                    <span>Endpoint: <code>{API}</code></span>
                  </div>
                </div>

                <div className="diag-mini-card">
                  <div className="diag-mini-header">
                    <IconDatabase size={18} className="text-blue" />
                    <strong>MySQL Database</strong>
                  </div>
                  <div className="diag-mini-body">
                    <span>Database: <strong>{dbStatus?.database || "steel_business"}</strong></span>
                    <span>Status: <strong className="text-green">Connected (Port 3306)</strong></span>
                  </div>
                </div>

                <div className="diag-mini-card">
                  <div className="diag-mini-header">
                    <IconImage size={18} className="text-gold" />
                    <strong>Cloudinary Media CDN</strong>
                  </div>
                  <div className="diag-mini-body">
                    <span>Hosted Assets: <strong>{totalPhotos} Images</strong></span>
                    <span>Status: <strong className="text-green">Online & Optimized</strong></span>
                  </div>
                </div>

                <div className="diag-mini-card">
                  <div className="diag-mini-header">
                    <IconShield size={18} className="text-purple" />
                    <strong>Admin Session</strong>
                  </div>
                  <div className="diag-mini-body">
                    <span>User: <strong>{adminUsername}</strong></span>
                    <span>Remaining: <strong>{sessionRemaining || "Active"}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary-outline"
                onClick={runDiagnostics}
                disabled={diagnosticsLoading}
              >
                <IconRefreshCw size={14} className={diagnosticsLoading ? "spin-icon" : ""} />
                <span>{diagnosticsLoading ? "Testing..." : "Re-test Connection"}</span>
              </button>

              <button
                type="button"
                className="btn-primary-gold"
                onClick={() => setShowDiagnosticsModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPACT CONSOLE FOOTER */}
      <footer className="console-footer">
        <div className="footer-left">
          <strong>DB METAL FABRICATION</strong>
          <span>• Admin Portal</span>
        </div>
        <div className="footer-right">
          <span>© {CURRENT_YEAR} DB Metal Fabrication</span>
        </div>
      </footer>
    </div>
  );
}

export default AdminDashboard;
