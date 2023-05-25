DOMAIN_NAME := $(shell sed -e '/HOST=/!d;s/HOST=//g' env.txt) 

DOMAIN_NAME_DASHED := $(shell echo $(DOMAIN_NAME)|sed -e 's/[.]/-/g')

all: env.txt
	@echo "default file env.txt created please run prepare and deploy if you adapted values in env.txt"

prepare:
	@mkdir -p output
	sed -e "s@__DOMAIN_NAME__@$(DOMAIN_NAME)@g;s@__DOMAIN_NAME_DASHED__@$(DOMAIN_NAME_DASHED)@g" *.yaml > output/mirotalk-k8s.yaml

deploy:
	kubectl delete configmap p2p || echo "ignore error"
	kubectl create configmap p2p --from-file=.env=env.txt 
	kubectl apply -f output/mirotalk-k8s.yaml

env.txt:
	@test -f env.txt || cp -v ../.env.template env.txt

uninstall:
	kubectl delete configmap p2p || :
	kubectl delete -f output/mirotalk-k8s.yaml

delete:
	kubectl delete configmap p2p || :
	kubectl delete -f output/mirotalk-k8s.yaml
	rm -rf env.txt output
