# <p align="center">MiroTalk P2P</p>

<p align="center">Free WebRTC - P2P - Simple, Secure, Fast Real-Time Video Conferences Up to 4k and 60fps, compatible with all browsers and platforms.</p>

<hr />

<p align="center">
    An adjusted and opiniated fork of <a href="https://github.com/miroslavpejic85/mirotalk">MiroTalk P2P</a>
</p>

<hr />

![image](https://user-images.githubusercontent.com/21357789/223714583-15c27bbd-f312-4a21-bcad-8cbf24b3db5a.png)

# Fork Adjustments

- Use different background images that look more professional.
- Remove sponsors and other unnecessary stuff from the index page (landing.html). Leave sponsor button and reference to the official MiroTalk GitHub repository. Only add the footer text `Powered by LRVT` as hyperlink to this adjusted repository.
- Adjust the Dockerfile to hold all relevant container data. 
  - No need to bind mount anything into the container as for the original MiroTalk repository and images.
- GitHub Actions to automatically build a Docker image and push it onto Dockerhub.
  - You can use `l4rm4nd/mirotalk:latest` from Dockerhub

# Usage

## Development & Testing

If you just want to test my fork of MiroTalk, issue the following Docker run command:

````
docker run -d -p 3000:3000 --name mirotalk l4rm4nd/mirotalk:latest
````

or if you'd like to use Docker Compose:

````
version: '3.7'

services:
  mirotalk:
    image: l4rm4nd/mirotalk:latest
    restart: unless-stopped
    container_name: mirotalk
    hostname: mirotalk
    ports:
      - 3000:3000 # WEB UI
````

The web service will be available on http://127.0.0.1:3000. Enjoy!

## Production

For productive use, you should adjust the example `.env` file and bind mount it into the container.

````
docker run -d -p 3000:3000 -v .env:/src/.env:ro --name mirotalk mirotalk:latest
````

or if you'd like to use Docker Compose:

````
version: '3.7'

services:
   myrotalk:
     image: l4rm4nd/mirotalk:latest
     restart: unless-stopped
     container_name: mirotalk
     hostname: mirotalk
     ports:
       - 3000:3000 # WEB UI
     volumes:
       - .env:/src/.env:ro
````

## Modifications

If you plan on adjusting the frontend to your needs, you can easily do this. Just download this repository data and bind mount the relevant directories `/app` and `public` into the container during runtime. For example:

````
# clone this repository
git clone https://github.com/l4rm4nd/mirotalk

# adjust the files to your preference
# create your custom .env file from the example .env.template

# run the container and bind mount your adjusted data (required: env, public and app)
docker run -d -p 3000:3000 -v .env:/src/.env:ro -v ./app/:/src/app/:ro -v ./public/:/src/public/:ro --name mirotalk l4rm4nd/mirotalk:latest
````
