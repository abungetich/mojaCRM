// Package jobs defines the background task queue (Asynq/Redis) used for
// work that shouldn't block an HTTP request, such as sending emails.
package jobs

import (
	"context"
	"encoding/json"
	"log"

	"github.com/hibiken/asynq"
)

const (
	TypeWelcomeEmail      = "email:welcome"
	TypeVerificationEmail = "email:verify"
)

type WelcomeEmailPayload struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type VerificationEmailPayload struct {
	Email           string `json:"email"`
	Name            string `json:"name"`
	VerificationURL string `json:"verification_url"`
}

func NewClient(redisAddr string) *asynq.Client {
	return asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})
}

func NewWelcomeEmailTask(email, name string) (*asynq.Task, error) {
	payload, err := json.Marshal(WelcomeEmailPayload{Email: email, Name: name})
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeWelcomeEmail, payload), nil
}

func NewVerificationEmailTask(email, name, verificationURL string) (*asynq.Task, error) {
	payload, err := json.Marshal(VerificationEmailPayload{Email: email, Name: name, VerificationURL: verificationURL})
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeVerificationEmail, payload), nil
}

// HandleWelcomeEmail is a placeholder worker: wire up a real mailer here.
func HandleWelcomeEmail(ctx context.Context, t *asynq.Task) error {
	var p WelcomeEmailPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}
	log.Printf("[jobs] would send welcome email to %s <%s>", p.Name, p.Email)
	return nil
}

// HandleVerificationEmail simulates sending the "verify your email" message
// by logging the link a real mailer would deliver. No mailer is wired up
// yet, so this is the stand-in until one is added.
func HandleVerificationEmail(ctx context.Context, t *asynq.Task) error {
	var p VerificationEmailPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}
	log.Printf("[jobs] SIMULATED verification email to %s <%s>: %s", p.Name, p.Email, p.VerificationURL)
	return nil
}

func NewMux() *asynq.ServeMux {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeWelcomeEmail, HandleWelcomeEmail)
	mux.HandleFunc(TypeVerificationEmail, HandleVerificationEmail)
	return mux
}
