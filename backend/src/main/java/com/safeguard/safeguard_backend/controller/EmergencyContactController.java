package com.safeguard.safeguard_backend.controller;

import com.safeguard.safeguard_backend.model.EmergencyContact;
import com.safeguard.safeguard_backend.repository.EmergencyContactRepository;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contacts")
@CrossOrigin(origins = "*")
public class EmergencyContactController {

    private final EmergencyContactRepository repository;

    public EmergencyContactController(EmergencyContactRepository repository) {
        this.repository = repository;
    }

    /** Each SafeGuardian user may save at most this many emergency contacts. */
    private static final int MAX_CONTACTS_PER_USER = 5;

    @PostMapping
    public ResponseEntity<?> addContact(@RequestBody EmergencyContact contact) {

        if (isBlank(contact.getUsername()) || isBlank(contact.getName())
                || isBlank(contact.getPhone()) || isBlank(contact.getRelation())) {

            return ResponseEntity.badRequest()
                    .body(Map.of("error", "username, name, phone and relation are all required."));
        }

        int existingCount = repository.findByUsername(contact.getUsername()).size();
        if (existingCount >= MAX_CONTACTS_PER_USER) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Maximum 5 emergency contacts allowed."));
        }

        EmergencyContact saved = repository.save(contact);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/{username}")
    public List<EmergencyContact> getContacts(@PathVariable String username) {
        return repository.findByUsername(username);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteContact(@PathVariable Long id) {

        try {
            repository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Contact deleted successfully"));

        } catch (EmptyResultDataAccessException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Contact with id " + id + " was not found."));
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
