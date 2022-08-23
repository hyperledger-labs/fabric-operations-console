/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 * 	  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package deployer

import (
	"encoding/json"
	"net/http"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	"go.uber.org/zap"
)

//Endpoint represents a particular endpoint
type Endpoint struct {
	// Handler is the handler function for this endpoint
	Handler func(w http.ResponseWriter, r *http.Request) (interface{}, int, error)

	Logger *zap.SugaredLogger
}

func NewEndpoint(handler func(http.ResponseWriter, *http.Request) (interface{}, int, error), logger *zap.Logger) *Endpoint {
	return &Endpoint{
		Handler: handler,
		Logger:  logger.Sugar().Named("Endpoint"),
	}
}

// Errors represent an errors response
type Errors struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
}

// ServeHTTP encapsulates the call to underlying Handlers to handle the request
// and return the response with a proper HTTP status code
func (se *Endpoint) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var resp interface{}
	w = NewHTTPResponseWriter(r, w, se)
	resp, statusCode, err := se.Handler(w, r)
	if err != nil {
		// An error occurred
		status := util.GetErrorStatusCode(err)
		w.WriteHeader(status)
		httpErr := &Errors{
			Status:  status,
			Message: err.Error(),
		}

		se.writeJSON(httpErr, w)
		se.Logger.Errorf(`failed to complete request to: %s %s %s, error code: %d, message: %s"`, r.RemoteAddr, r.Method, r.URL, httpErr.Status, httpErr.Message)
		return
	}

	httpStatus := http.StatusOK
	if statusCode != 0 {
		httpStatus = statusCode
	}
	w.WriteHeader(httpStatus)
	se.Logger.Infof(`%s %s %s %d 0 "OK"`, r.RemoteAddr, r.Method, r.URL, httpStatus)

	// If a response was returned by the handler, write it now.
	se.writeJSON(resp, w)
}

func (se *Endpoint) writeJSON(obj interface{}, w http.ResponseWriter) {
	enc := json.NewEncoder(w)
	err := enc.Encode(obj)
	if err != nil {
		se.Logger.Errorf("Failed encoding response to JSON: %s", err)
	}
}

func NewHTTPResponseWriter(r *http.Request, w http.ResponseWriter, se *Endpoint) *HTTPResponseWriter {
	return &HTTPResponseWriter{r: r, w: w, se: se}
}

type HTTPResponseWriter struct {
	r                 *http.Request
	w                 http.ResponseWriter
	se                *Endpoint
	writeHeaderCalled bool
	writeCalled       bool
}

// Header returns the header map that will be sent by WriteHeader.
func (hrw *HTTPResponseWriter) Header() http.Header {
	return hrw.w.Header()
}

// WriteHeader sends an HTTP response header with status code.
func (hrw *HTTPResponseWriter) WriteHeader(scode int) {
	if !hrw.writeHeaderCalled {
		w := hrw.w
		w.Header().Set("Connection", "Keep-Alive")
		if hrw.isHead() {
			w.Header().Set("Content-Length", "0")
		} else {
			w.Header().Set("Transfer-Encoding", "chunked")
			w.Header().Set("Content-Type", "application/json")
		}
		w.WriteHeader(scode)
		hrw.writeHeaderCalled = true
	}
}

// Write writes the data to the connection as part of an HTTP reply.
func (hrw *HTTPResponseWriter) Write(buf []byte) (int, error) {
	return hrw.w.Write(buf)
}

func (hrw *HTTPResponseWriter) isHead() bool {
	return hrw.r.Method == "HEAD"
}
