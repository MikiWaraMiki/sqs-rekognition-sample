# API Gateway + Lambda + SQS + AWS Rekognition

## Summary

- AWS 上にサーバレスで、アップロードした画像の解析を行う

- 以下の AWS の技術を利用する
  - API Gateway
  - Lambda(api のアクセス受付用、rekognition の解析をかける backend 用)
  - S3
  - SQS
  - AWS Rekognition

## Requirements

- aws-cdk
  - `>=1.101.0`
- node
  - `>=12.16.0`
- yarn
  - `>=1.22.5`

## Getting Started

### Create Infra on AWS

- 最初に、cdk に必要な S3・CloudFormation をセットアップしてください

```
cdk bootstrap --profile {your profile}
```

- S3 のバケット名を定義するファイルを作成してください。

```
cp .env/config.sample.ts .env/config.ts

cat .env/config.ts
type envConfigType = {
  s3: {
    name: string
  }
}

export const ENV_CONFIG: envConfigType = {
  s3: {
    name: 'YOUR BUCKET NAME',
  },
}
```

- 以下のコマンドを実行すると、環境が構築されます

```
cdk deploy --profile {your profile}
```

### Request Api Gateway

- postman 等を利用して、構築された API Gateway に POST リクエストをかけてください。
  - リクエスト時の画像は、`base64`に変換されている必要があります。
  - 必要に応じて、以下のコマンドを実行して、`base64`文字列を取得してください。

```
node scripts/base64Encoder.js ~/path/to/image
```

### Delete Infra

- 以下のコマンドを実行すると、インフラが削除されます。

```
cdk delete --profile {your profile}
```
