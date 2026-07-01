// Package docs embeds the OpenAPI spec so it ships inside the binary and
// can be served directly by the API (no separate file to deploy/mount).
package docs

import _ "embed"

//go:embed openapi.yaml
var OpenAPISpec []byte
