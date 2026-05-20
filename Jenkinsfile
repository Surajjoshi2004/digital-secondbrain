pipeline {
    agent any

    environment {
        NODE_DIR = "${WORKSPACE}/node-v20.18.0-linux-x64"
        NODE_PATH = "${NODE_DIR}/bin"
        PATH = "${NODE_PATH}:${env.PATH}"
    }

    stages {
        stage('Setup Node') {
            steps {
                sh '''
                    if [ ! -d "$NODE_DIR" ]; then
                        curl -fsSL https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz -o node.tar.xz
                        tar -xf node.tar.xz
                    fi
                    node --version
                    npm --version
                '''
            }
        }

        stage('Backend Install') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Backend Test') {
            steps {
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Frontend Install') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Frontend Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy to Render') {
            when {
                branch 'main'
            }
            steps {
                sh 'curl -X POST https://api.render.com/deploy/srv/$RENDER_SERVICE_ID?key=$RENDER_DEPLOY_KEY'
            }
        }
    }
}
