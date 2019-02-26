# demoFor721

## 部署合约
npm install 后会导入 OpenZeppelin 的721依赖，合约中已经写好依赖，只需要将src/QRC.721 部署上去即可

1. 安装 solar
2. 使用 solar 部署合约 命令举例：

solar deploy src/QRC721.sol '["ipfs","iq"]' --qtum_rpc=http://liqi:qtum@127.0.0.1:13889 --qtum_sender=qUYqDmqgA5w8kkojgwoi4cmc18Y3tm8yPE

其中的 ["ipfs","iq"]是 token 的 name 和 symbol，名字和代币名称， --qtum-sender 是发布合约的地址。
部署成功后会在目录下出现 solar.development.json 文件。

## 启动
npm start
