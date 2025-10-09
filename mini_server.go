package main

// mini_server.go
// Simple Go HTTP server with /health, /time, /echo endpoints.

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

func health(w http.ResponseWriter, _ *http.Request) {
	resp := map[string]string{"status": "ok", "time": time.Now().Format(time.RFC3339)}
	json.NewEncoder(w).Encode(resp)
}

func currentTime(w http.ResponseWriter, _ *http.Request) {
	fmt.Fprintf(w, "Current server time: %s\n", time.Now().Format(time.RFC3339))
}

func echo(w http.ResponseWriter, r *http.Request) {
	msg := r.URL.Query().Get("msg")
	if msg == "" {
		msg = "hello"
	}
	fmt.Fprintf(w, "Echo: %s\n", msg)
}

func main() {
	http.HandleFunc("/health", health)
	http.HandleFunc("/time", currentTime)
	http.HandleFunc("/echo", echo)

	port := "8080"
	fmt.Println("Starting mini server on port", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
