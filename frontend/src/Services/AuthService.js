// AuthService handles authentication through backend proxy
class AuthService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api/v1';
    this.token = localStorage.getItem('token');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async login(username, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      if (data.success) {
        this.token = data.data.access_token;
        this.refreshToken = data.data.refresh_token;
        
        localStorage.setItem('token', this.token);
        localStorage.setItem('refreshToken', this.refreshToken);
        
        return {
          authenticated: true,
          token: this.token,
          user: data.user,
        };
      }
      
      throw new Error(data.message || 'Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.refreshToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      if (data.success) {
        this.token = data.data.access_token;
        this.refreshToken = data.data.refresh_token;
        
        localStorage.setItem('token', this.token);
        localStorage.setItem('refreshToken', this.refreshToken);
        
        return this.token;
      }
      
      throw new Error(data.message || 'Token refresh failed');
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      throw error;
    }
  }

  async logout() {
    if (this.token) {
      try {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated() {
    return !!this.token;
  }

  getToken() {
    return this.token;
  }

  // Extract roles from token (JWT)
  getRoles() {
    if (!this.token) return [];

    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      const roles = [];
      const roleSet = new Set();

      const subtitlesRoleRex = new RegExp(
        "subtitles_(?<role>.*)|(?<admin_role>admin)"
      );

      // Check client roles first (preferred)
      const clientId = process.env.REACT_APP_KEYCLOAK_CLIENT_ID;
      if (clientId && payload.resource_access && payload.resource_access[clientId]) {
        const clientRoles = payload.resource_access[clientId].roles || [];
        for (const role of clientRoles) {
          const match = role.match(subtitlesRoleRex);
          if (match && match.groups) {
            const securityRole = match.groups.role || match.groups.admin_role;
            if (securityRole && !roleSet.has(securityRole)) {
              roles.push(securityRole);
              roleSet.add(securityRole);
            }
          }
        }
      }

      // Fallback to realm roles
      if (payload.realm_access && payload.realm_access.roles) {
        const realmRoles = payload.realm_access.roles || [];
        for (const role of realmRoles) {
          const match = role.match(subtitlesRoleRex);
          if (match && match.groups) {
            const securityRole = match.groups.role || match.groups.admin_role;
            if (securityRole && !roleSet.has(securityRole)) {
              roles.push(securityRole);
              roleSet.add(securityRole);
            }
          }
        }
      }

      return roles;
    } catch (error) {
      console.error('Error parsing token:', error);
      return [];
    }
  }

  isAdmin() {
    const roles = this.getRoles();
    return roles.includes('admin');
  }
}

export default AuthService;
