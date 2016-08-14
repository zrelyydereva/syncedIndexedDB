#楕円曲線暗号でのキーファイル作成
openssl ecparam -genkey -name prime256v1 -noout -out ec256-key-pair.pem
openssl ecparam -genkey -name secp384r1 -noout -out ec384-key-pair.pem
openssl ecparam -genkey -name secp521r1 -noout -out ec512-key-pair.pem
openssl ec -in ec256-key-pair.pem -outform PEM -pubout -out ec256-key-pub.pem
openssl ec -in ec384-key-pair.pem -outform PEM -pubout -out ec384-key-pub.pem
openssl ec -in ec512-key-pair.pem -outform PEM -pubout -out ec512-key-pub.pem
openssl ec -in ec256-key-pair.pem -outform PEM -out ec256-key-pri.pem
openssl ec -in ec384-key-pair.pem -outform PEM -out ec384-key-pri.pem
openssl ec -in ec512-key-pair.pem -outform PEM -out ec512-key-pri.pem
