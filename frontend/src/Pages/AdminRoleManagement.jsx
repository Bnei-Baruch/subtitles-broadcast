import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Table,
  Badge,
  Modal,
  Alert,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import axios from "../Utils/AxiosInstance";

const AdminRoleManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);

  // Form states
  const [userForm, setUserForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    enabled: true,
    emailVerified: false,
    password: "",
    passwordConfirm: "",
    temporary: true, // Default to true, matching Keycloak behavior
  });
  const [selectedRole, setSelectedRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    pageSize: 50,
    hasMore: false,
    total: 0,
  });

  // Available client roles
  const clientRoles = [
    {
      id: "subtitles_admin",
      name: "Admin",
      description: "Full access + role management",
      color: "danger",
    },
    {
      id: "subtitles_operator",
      name: "Operator",
      description: "Access to Subtitles, Archive, Source, New pages",
      color: "primary",
    },
    {
      id: "subtitles_translator",
      name: "Translator",
      description: "Access to Question page",
      color: "success",
    },
  ];

  useEffect(() => {
    fetchAvailableRoles();
  }, []);

  useEffect(() => {
    // Fetch users when search term changes (server-side search)
    // Reset to page 1 when search term changes
    fetchUsers(1);
  }, [searchTerm]);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      // Send search parameter and page to backend for server-side filtering and pagination
      const url = searchTerm
        ? `/admin/users?search=${encodeURIComponent(searchTerm)}&page=${page}`
        : `/admin/users?page=${page}`;
      const response = await axios.get(url);
      const fetchedUsers = response.data.data || [];

      // Only fetch roles for users on current page (max 50 users)
      const usersWithRoles = await Promise.all(
        fetchedUsers.map(async (user) => {
          try {
            const rolesResponse = await axios.get(
              `/admin/users/${user.id}/roles`
            );
            return {
              ...user,
              roles: rolesResponse.data.data || [],
            };
          } catch (err) {
            console.error(`Failed to fetch roles for user ${user.id}:`, err);
            return {
              ...user,
              roles: [],
            };
          }
        })
      );

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles); // Set filtered users to the same as fetched users

      // Store pagination info
      setPaginationInfo({
        page: response.data.page || 1,
        pageSize: response.data.pageSize || 50,
        hasMore: response.data.hasMore || false,
        total: response.data.total || usersWithRoles.length,
      });
    } catch (err) {
      setError(
        "Failed to fetch users: " + (err.response?.data?.err || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRoles = async () => {
    try {
      const response = await axios.get("/admin/roles");
      setAvailableRoles(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  };

  const handleCreateUser = async () => {
    // Validate password confirmation
    if (userForm.password && userForm.password !== userForm.passwordConfirm) {
      setError(
        "Passwords do not match. Please check your password confirmation."
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Remove passwordConfirm from the request (it's only for frontend validation)
      const { passwordConfirm, ...userData } = userForm;
      await axios.post("/admin/users", userData);
      setSuccess("User created successfully!");
      setShowUserModal(false);
      resetUserForm();
      fetchUsers();
    } catch (err) {
      setError(
        "Failed to create user: " + (err.response?.data?.err || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    // Validate password confirmation
    if (userForm.password && userForm.password !== userForm.passwordConfirm) {
      setError(
        "Passwords do not match. Please check your password confirmation."
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Remove passwordConfirm from the request (it's only for frontend validation)
      const { passwordConfirm, ...userData } = userForm;
      await axios.put(`/admin/users/${selectedUser.id}`, userData);
      setSuccess("User updated successfully!");
      setShowUserModal(false);
      resetUserForm();
      fetchUsers();
    } catch (err) {
      setError(
        "Failed to update user: " + (err.response?.data?.err || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    setLoading(true);
    setError("");
    try {
      await axios.delete(`/admin/users/${userId}`);
      setSuccess("User deleted successfully!");
      fetchUsers();
    } catch (err) {
      setError(
        "Failed to delete user: " + (err.response?.data?.err || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    setLoading(true);
    setError("");
    try {
      await axios.post(`/admin/users/${selectedUser.id}/roles`, {
        role_name: selectedRole,
      });
      setSuccess("Role assigned successfully!");
      setShowRoleModal(false);
      setSelectedRole("");
      fetchUsers(paginationInfo.page); // Refresh current page
    } catch (err) {
      setError(
        "Failed to assign role: " + (err.response?.data?.err || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (userId, roleName) => {
    if (
      !window.confirm(
        `Are you sure you want to remove the ${roleName} role from this user?`
      )
    )
      return;

    setLoading(true);
    setError("");
    try {
      await axios.delete(`/admin/users/${userId}/roles/${roleName}`);
      setSuccess("Role removed successfully!");
      fetchUsers(paginationInfo.page); // Refresh current page
    } catch (err) {
      setError(
        "Failed to remove role: " + (err.response?.data?.err || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const openUserModal = (user = null) => {
    if (user) {
      setUserForm({
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        enabled: user.enabled !== false,
        emailVerified: user.emailVerified || false,
        password: "", // Don't populate password for security
        passwordConfirm: "", // Don't populate password confirmation
        temporary: user.temporary || false, // Use actual temporary status from user data
      });
      setSelectedUser(user);
    } else {
      resetUserForm();
      setSelectedUser(null);
    }
    setShowUserModal(true);
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setSelectedRole("");
    setShowRoleModal(true);
  };

  const resetUserForm = () => {
    setUserForm({
      email: "",
      firstName: "",
      lastName: "",
      enabled: true,
      emailVerified: false,
      password: "",
      passwordConfirm: "",
      temporary: true, // Default to true, matching Keycloak behavior
    });
    setSelectedUser(null);
    setShowPassword(false);
    setShowPasswordConfirm(false);
  };

  const getUserRoles = (user) => {
    // Handle both old format (array of role objects) and new format (array of role names)
    if (!user.roles || !Array.isArray(user.roles)) {
      return [];
    }

    // If roles are strings (role names), convert to role objects
    return user.roles.map((role) => {
      if (typeof role === "string") {
        return { id: role, name: role };
      }
      return role;
    });
  };

  const hasRole = (user, roleId) => {
    return getUserRoles(user).some(
      (role) => role.id === roleId || role.name === roleId
    );
  };

  const getRoleBadge = (roleId) => {
    const role = availableRoles.find((r) => r.id === roleId);
    return role ? (
      <Badge bg="primary" className="me-1">
        {role.name}
      </Badge>
    ) : (
      <Badge bg="secondary" className="me-1">
        {roleId}
      </Badge>
    );
  };

  // Render roles with truncation and tooltip for better table layout
  const renderRolesWithTooltip = (user) => {
    const roles = getUserRoles(user);
    
    if (roles.length === 0) {
      return <span className="text-muted">No roles assigned</span>;
    }

    // Show first 2 roles, then "+X more" if there are more
    const maxVisibleRoles = 2;
    const visibleRoles = roles.slice(0, maxVisibleRoles);
    const remainingCount = roles.length - maxVisibleRoles;

    const roleElements = visibleRoles.map((role) => (
      <Badge
        key={role.id || role.name}
        bg="primary"
        className="me-1 mb-1"
        style={{ fontSize: "0.75em" }}
      >
        {role.name || role.id}
      </Badge>
    ));

    if (remainingCount > 0) {
      roleElements.push(
        <Badge
          key="more"
          bg="secondary"
          className="me-1 mb-1"
          style={{ fontSize: "0.75em" }}
        >
          +{remainingCount} more
        </Badge>
      );
    }

    // Create tooltip content with all roles
    const tooltipContent = (
      <Tooltip id={`tooltip-${user.id}`}>
        <div>
          <strong>All Roles:</strong>
          <br />
          {roles.map((role) => (
            <div key={role.id || role.name}>
              • {role.name || role.id}
            </div>
          ))}
        </div>
      </Tooltip>
    );

    return (
      <OverlayTrigger
        placement="top"
        overlay={tooltipContent}
        delay={{ show: 250, hide: 100 }}
      >
        <div className="d-flex flex-wrap align-items-center" style={{ maxHeight: "2.5em", overflow: "hidden" }}>
          {roleElements}
        </div>
      </OverlayTrigger>
    );
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <Card className="shadow">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <span className="me-2">🛡️</span>
                <h4 className="mb-0">User Role Management</h4>
              </div>
              <Button
                variant="primary"
                onClick={() => openUserModal()}
                disabled={loading}
              >
                <span className="me-1">+</span>
                Add User
              </Button>
            </Card.Header>

            <Card.Body>
              {success && (
                <Alert
                  variant="success"
                  dismissible
                  onClose={() => setSuccess("")}
                >
                  {success}
                </Alert>
              )}

              {/* Search Bar */}
              <Row className="mb-3">
                <Col md={6}>
                  <div className="position-relative">
                    <span
                      className="position-absolute"
                      style={{
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    >
                      🔍
                    </span>
                    <Form.Control
                      type="text"
                      placeholder="Search users by name, email, or username..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: "40px" }}
                    />
                  </div>
                </Col>
                <Col md={6} className="d-flex align-items-center">
                  <span className="me-2">👥</span>
                  <span className="text-muted">
                    {filteredUsers.length} user
                    {filteredUsers.length !== 1 ? "s" : ""} found
                  </span>
                </Col>
              </Row>

              {/* Users Table */}
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Roles</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div>
                              <strong>
                                {user.firstName} {user.lastName}
                              </strong>
                              <br />
                              <small className="text-muted">
                                @{user.username}
                              </small>
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            <Badge bg={user.enabled ? "success" : "secondary"}>
                              {user.enabled ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td style={{ verticalAlign: "middle", minHeight: "60px" }}>
                            {renderRolesWithTooltip(user)}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => openUserModal(user)}
                                disabled={loading}
                                title="Edit User"
                              >
                                ✏️
                              </Button>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => openRoleModal(user)}
                                disabled={loading}
                                title="Manage Roles"
                              >
                                🛡️
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={loading}
                                title="Delete User"
                              >
                                🗑️
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted">
                  Showing {users.length} of {paginationInfo.total} users
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={paginationInfo.page <= 1}
                    onClick={() => fetchUsers(paginationInfo.page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="align-self-center px-2">
                    Page {paginationInfo.page}
                  </span>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={!paginationInfo.hasMore}
                    onClick={() => fetchUsers(paginationInfo.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* User Modal */}
      <Modal
        show={showUserModal}
        onHide={() => setShowUserModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedUser ? "Edit User" : "Create New User"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert
              variant="danger"
              dismissible
              onClose={() => setError("")}
              className="mb-3"
            >
              {error}
            </Alert>
          )}
          <Form>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm({ ...userForm, email: e.target.value })
                    }
                    placeholder="Enter email (username will be auto-generated)"
                    required
                  />
                  <Form.Text className="text-muted">
                    Username will be automatically generated from the email
                    address
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={userForm.firstName}
                    onChange={(e) =>
                      setUserForm({ ...userForm, firstName: e.target.value })
                    }
                    placeholder="Enter first name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={userForm.lastName}
                    onChange={(e) =>
                      setUserForm({ ...userForm, lastName: e.target.value })
                    }
                    placeholder="Enter last name"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="enabled-switch"
                label="User Enabled"
                checked={userForm.enabled}
                onChange={(e) =>
                  setUserForm({ ...userForm, enabled: e.target.checked })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="email-verified-switch"
                label="Email Verified"
                checked={userForm.emailVerified}
                onChange={(e) =>
                  setUserForm({ ...userForm, emailVerified: e.target.checked })
                }
              />
              <Form.Text className="text-muted">
                Mark email as verified for testing purposes
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  placeholder="Enter password (leave empty to keep current)"
                />
                <Button
                  variant="link"
                  className="position-absolute end-0 top-50 translate-middle-y pe-3"
                  style={{
                    border: "none",
                    background: "none",
                    padding: "0",
                    zIndex: 10,
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? "🙈" : "👁️"}
                </Button>
              </div>
              <Form.Text className="text-muted">
                Leave empty to keep current password unchanged
              </Form.Text>
            </Form.Group>
            {userForm.password && (
              <Form.Group className="mb-3">
                <Form.Label>Confirm Password</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type={showPasswordConfirm ? "text" : "password"}
                    value={userForm.passwordConfirm}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        passwordConfirm: e.target.value,
                      })
                    }
                    placeholder="Confirm password"
                    isInvalid={
                      userForm.passwordConfirm &&
                      userForm.password !== userForm.passwordConfirm
                    }
                  />
                  <Button
                    variant="link"
                    className="position-absolute end-0 top-50 translate-middle-y pe-3"
                    style={{
                      border: "none",
                      background: "none",
                      padding: "0",
                      zIndex: 10,
                    }}
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    type="button"
                  >
                    {showPasswordConfirm ? "🙈" : "👁️"}
                  </Button>
                </div>
                {userForm.passwordConfirm &&
                  userForm.password !== userForm.passwordConfirm && (
                    <Form.Control.Feedback type="invalid">
                      Passwords do not match
                    </Form.Control.Feedback>
                  )}
                <Form.Text className="text-muted">
                  Re-enter the password to confirm
                </Form.Text>
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="temporary-switch"
                label="Temporary Password"
                checked={userForm.temporary}
                onChange={(e) =>
                  setUserForm({ ...userForm, temporary: e.target.checked })
                }
              />
              <Form.Text className="text-muted">
                User will be required to change password on next login
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={selectedUser ? handleUpdateUser : handleCreateUser}
            disabled={loading || !userForm.email}
          >
            {loading
              ? "Saving..."
              : selectedUser
                ? "Update User"
                : "Create User"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Role Assignment Modal */}
      <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            Assign Role to {selectedUser?.firstName} {selectedUser?.lastName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Role</Form.Label>
              <Form.Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">Choose a role...</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} - {role.description}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {selectedUser && (
              <div>
                <h6>Current Roles:</h6>
                <div className="d-flex flex-wrap">
                  {getUserRoles(selectedUser).map((role) => (
                    <Badge
                      key={role.id || role.name}
                      bg="info"
                      className="me-1 mb-1"
                    >
                      {role.name || role.id}
                    </Badge>
                  ))}
                  {getUserRoles(selectedUser).length === 0 && (
                    <span className="text-muted">No roles assigned</span>
                  )}
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRoleModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAssignRole}
            disabled={loading || !selectedRole}
          >
            {loading ? "Assigning..." : "Assign Role"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminRoleManagement;
