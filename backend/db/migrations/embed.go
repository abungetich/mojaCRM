// Package migrations embeds the SQL migration files so the server binary
// can apply them at startup without needing a separate migration tool.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
