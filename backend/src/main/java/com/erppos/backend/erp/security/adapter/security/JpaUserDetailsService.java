package com.erppos.backend.erp.security.adapter.security;

import com.erppos.backend.erp.security.infrastructure.persistence.UserEntity;
import com.erppos.backend.erp.security.infrastructure.persistence.UserJpaRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
public class JpaUserDetailsService implements UserDetailsService {

    private final UserJpaRepository userJpaRepository;

    public JpaUserDetailsService(UserJpaRepository userJpaRepository) {
        this.userJpaRepository = userJpaRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        UserEntity user = userJpaRepository
                .findByUsernameIgnoreCaseOrEmailIgnoreCase(usernameOrEmail, usernameOrEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return new ErpUserDetails(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPasswordHash(),
                user.isActive(),
                user.getRoles().stream().map(role -> role.getName()).collect(Collectors.toSet())
        );
    }
}

