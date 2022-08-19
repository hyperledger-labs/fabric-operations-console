package operator_test

import (
	"encoding/json"

	"github.com/pkg/errors"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/operator"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/operator/mocks"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"go.uber.org/zap"
)

var _ = Describe("Operator", func() {

	var (
		err          error
		testOperator *operator.Operator
		mockKube     *mocks.Kube
		logger       *zap.Logger
	)

	BeforeEach(func() {
		logger, err = zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())

		mockKube = &mocks.Kube{}

		testOperator = operator.New(logger, mockKube)

		mockKube.GetConfigMapStub = func(namespace, name string) (*corev1.ConfigMap, error) {
			type hsm struct {
				Type    string
				Version string
			}
			config := &hsm{
				Type:    "hsm",
				Version: "v1",
			}
			configBytes, _ := json.Marshal(config)
			cm := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      name,
					Namespace: namespace,
				},
				Data: map[string]string{"ibp-hsm-config.yaml": string(configBytes)},
			}
			return cm, nil
		}
	})
	Context("get hsm config", func() {
		It("returns error if fails to get config map", func() {
			mockKube.GetConfigMapReturns(nil, errors.New("get error"))
			_, err := testOperator.GetHSMConfig("test-ns")
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("get error"))
		})

		It("returns error if data is empty in config map", func() {
			cm := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "ibp-hsm-config",
					Namespace: "test-ns",
				},
			}
			mockKube.GetConfigMapReturns(cm, nil)
			_, err := testOperator.GetHSMConfig("test-ns")
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("ibp-hsm-config.yaml not found in configmap"))
		})

		It("returns config", func() {
			config, err := testOperator.GetHSMConfig("test-ns")
			Expect(err).NotTo(HaveOccurred())
			Expect(config).NotTo(BeNil())
		})
	})

})
