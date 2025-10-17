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
  });
  const [selectedRole, setSelectedRole] = useState("");

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
    fetchUsers();
    fetchAvailableRoles();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(
      (user) =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get("/admin/users");
      setUsers(response.data.data || []);
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
    setLoading(true);
    setError("");
    try {
      await axios.post("/admin/users", userForm);
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
    setLoading(true);
    setError("");
    try {
      await axios.put(`/admin/users/${selectedUser.id}`, userForm);
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
      fetchUsers();
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
      fetchUsers();
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
    });
    setSelectedUser(null);
  };

  const getUserRoles = (user) => {
    return user.roles || [];
  };

  const hasRole = (user, roleId) => {
    return getUserRoles(user).some(
      (role) => role.id === roleId || role.name === roleId
    );
  };

  const getRoleBadge = (roleId) => {
    const role = clientRoles.find((r) => r.id === roleId);
    return role ? (
      <Badge bg={role.color} className="me-1">
        {role.name}
      </Badge>
    ) : (
      <Badge bg="secondary" className="me-1">
        {roleId}
      </Badge>
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
              {error && (
                <Alert
                  variant="danger"
                  dismissible
                  onClose={() => setError("")}
                >
                  {error}
                </Alert>
              )}

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
                          <td>
                            <div className="d-flex flex-wrap">
                              {getUserRoles(user).map((role) => (
                                <div
                                  key={role.id || role.name}
                                  className="d-flex align-items-center me-2 mb-1"
                                >
                                  {getRoleBadge(role.id || role.name)}
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveRole(
                                        user.id,
                                        role.id || role.name
                                      )
                                    }
                                    disabled={loading}
                                    style={{
                                      padding: "2px 4px",
                                      fontSize: "10px",
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                              {getUserRoles(user).length === 0 && (
                                <span className="text-muted">
                                  No roles assigned
                                </span>
                              )}
                            </div>
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
                {clientRoles.map((role) => (
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
