package service

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
)

const TemplatesDir = "./templates"

type TemplateMeta struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// EnsureTemplates initializes the templates directory and seeds default templates from embedded FS if missing
func EnsureTemplates(embedded fs.FS) error {
	if _, err := os.Stat(TemplatesDir); errors.Is(err, os.ErrNotExist) {
		if err := os.MkdirAll(TemplatesDir, 0o755); err != nil {
			return err
		}
		// Copy embedded templates into TemplatesDir
		if err := fs.WalkDir(embedded, ".", func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() {
				return nil
			}
			if filepath.Ext(d.Name()) == ".json" {
				outPath := filepath.Join(TemplatesDir, path)
				if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
					return err
				}
				data, rerr := fs.ReadFile(embedded, path)
				if rerr != nil {
					return rerr
				}
				if err := os.WriteFile(outPath, data, 0o644); err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			return err
		}
	}
	return nil
}

// ListTemplates scans the templates directory and returns basic metadata
func ListTemplates() ([]TemplateMeta, error) {
	entries := []TemplateMeta{}
	err := filepath.WalkDir(TemplatesDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if filepath.Ext(d.Name()) == ".json" {
			data, rerr := os.ReadFile(path)
			if rerr != nil {
				return rerr
			}
			// Always use filename as ID
			base := filepath.Base(path)
			id := base[:len(base)-len(filepath.Ext(base))]

			var tmp struct {
				Name        string `json:"name"`
				Description string `json:"description"`
			}
			name := id
			description := ""
			if jerr := json.Unmarshal(data, &tmp); jerr == nil {
				if tmp.Name != "" {
					name = tmp.Name
				}
				description = tmp.Description
			}
			entries = append(entries, TemplateMeta{ID: id, Name: name, Description: description})
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return entries, nil
}

// GetTemplate loads a template JSON by ID and returns raw bytes
func GetTemplate(id string) ([]byte, error) {
	path := filepath.Join(TemplatesDir, id+".json")
	return os.ReadFile(path)
}
