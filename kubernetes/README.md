# k8s deployment

![k8s](../public/images/k8s.png)

## TLDR; and do not care way

```bash
$ make
$ sed -i s/localhost/myshinydomain.tld/g env.txt
$ make prepare
$ make deploy
```

# Understanding way

If you would like to deploy Mirotalk to kubernetes
this set of files can help you in that task

Bellow is explanation of files in this folder which will form one output file in `output` folder

## ../.env.template and your file env.txt that you should prepare

Configuration file that is for now used to configure deployment
you should copy `../.env.template` to current directory as `env.txt` and edit values inside to your liking

```bash
$ cp ../.env.template env.txt
```

Change values (if nothing else **HOST** variable must be changed so your ingress would recognize it and send requests to your deployed application),
if you do not have public domain you can use free service called [nip.io](https://nip.io/) with domain like `p2p.192-168-1-1.nip.io` (or [sslip.io](https://sslip.io/))

```bash
$ sed -i s/localhost/myshinydomain.tld/g env.txt
```

## p2p-deployment.yaml

Main deployment file where you change image file if you would like to use yours if not official one (`image`: tag)

## p2p-cert.yaml

This file represent definition of certificate (request) when using [Cert Manager](https://cert-manager.io/) to generate letsencrypt or private certificates for your domain will be pulled out from `env.txt`

## p2p-ingress.yaml

This is generic ingress object in kubernetes that is responsible to route external traffic to mirotalk deployed application and if used in conjuction with p2p-cert.yaml (default) will provide TLS enabled access to your mirotalk instance

## p2p-service.yaml

Service required for ingress to be able to know how to access deployment

## Makefile

Helper file that allows running it to configure application how you would like

after creating and changing configuration file (`env.txt`) run these two tasks, prepare will create deployment file
and deployment will create configMap from prepared `env.txt` file.

Please run after reading all this:

```bash
$ make
# edit env.txt or use sed as in TLDR section :)
$ make prepare
$ make deploy
```
