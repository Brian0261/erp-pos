package com.erppos.backend.erp.security.adapter.security;

import com.erppos.backend.erp.security.domain.RoleName;
import com.erppos.backend.erp.security.domain.SecurityUser;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public class ErpUserDetails implements UserDetails {

    private final UUID id;
    private final String username;
    private final String email;
    private final String password;
    private final boolean active;
    private final Set<RoleName> roles;

    public ErpUserDetails(UUID id, String username, String email, String password, boolean active, Set<RoleName> roles) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.active = active;
        this.roles = roles;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public Set<RoleName> getRoles() {
        return roles;
    }

    public SecurityUser toDomain() {
        return new SecurityUser(id, username, email, active, roles);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.name()))
                .collect(Collectors.toSet());
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}

