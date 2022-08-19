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

package ibpoperator

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"
)

type Client struct {
	client *IBPClient
}

func New(config *rest.Config) (*Client, error) {
	c, err := NewIBPClient(config)
	if err != nil {
		return nil, err
	}

	return &Client{
		client: c,
	}, nil
}

func (i *Client) GetCR(namespace string, kind string, name string, cr runtime.Object) error {
	result := i.client.Get().Namespace(namespace).Resource(kind).Name(name).Do(context.TODO())
	err := result.Error()
	if err != nil {
		return err
	}
	err = result.Into(cr)
	if err != nil {
		return err
	}
	return nil
}

func (i *Client) GetAllCR(namespace string, kind string, crList runtime.Object) error {
	result := i.client.Get().Namespace(namespace).Resource(kind).Do(context.TODO())
	err := result.Error()
	if err != nil {
		return err
	}
	err = result.Into(crList)
	if err != nil {
		return err
	}
	return nil
}

func (i *Client) CreateCR(namespace string, kind string, cr interface{}) error {
	result := i.client.Post().Namespace(namespace).Resource(kind).Body(cr).Do(context.TODO())
	err := result.Error()
	if err != nil {
		return err
	}
	return nil
}

func (i *Client) DeleteCR(namespace string, kind string, name string) error {
	result := i.client.Delete().Namespace(namespace).Resource(kind).Name(name).Do(context.TODO())
	err := result.Error()
	if err != nil {
		return err
	}
	return nil
}

func (i *Client) UpdateCR(namespace string, kind string, name string, bytes []byte) error {
	result := i.client.Put().Namespace(namespace).Resource(kind).Name(name).Body(bytes).Do(context.TODO())
	err := result.Error()
	if err != nil {
		return err
	}
	return nil
}

func (i *Client) PatchCR(namespace string, kind string, name string, bytes []byte) error {
	result := i.client.Patch(types.MergePatchType).Namespace(namespace).Resource(kind).Name(name).Body(bytes).Do(context.TODO())
	err := result.Error()
	if err != nil {
		return err
	}
	return nil
}
