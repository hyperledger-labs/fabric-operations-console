package api

type CreateRequest struct {
	HSMConfig interface{} `json:"hsmconfig,omitempty"`
}

type UpdateRequest struct {
	HSMConfig interface{} `json:"hsmconfig,omitempty"`
}

type Response struct {
	HSMConfig interface{} `json:"hsmconfig,omitempty"`
}
