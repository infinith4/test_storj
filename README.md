# test_storj

https://docs.storj.io/dcs/getting-started

sudo -v ; curl https://rclone.org/install.sh | sudo bash

rclone config file

```
[storj]
type = s3
provider = Storj
access_key_id =  access_key # REPLACE ME
secret_access_key = secret_key  # REPLACE ME
endpoint = gateway.storjshare.io
chunk_size = 64Mi
disable_checksum: true
```

rclone mkdir storj:test-bucket

rclone lsf storj:



rclone copy ./upload_files/screeen_shot_2024-01-04\ 16.10.27.png storj:test-bucket/

### Download bucket

rclone copy storj:test-bucket ~/Downloads/test_image01.png


rclone ls storj:test-bucket

