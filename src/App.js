'use strict'
import React from 'react'
import ipfsAPI from 'ipfs-api'
import { Qtum } from 'qtumjs'
import Button from '@material-ui/core/Button'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableRow from '@material-ui/core/TableRow'
import CircularProgress from '@material-ui/core/CircularProgress'
import { withStyles } from '@material-ui/core/styles'
import CssBaseline from '@material-ui/core/CssBaseline'
import Grid from '@material-ui/core/Grid'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'
import { blue } from '@material-ui/core/colors'
import repo from './solar.development.json'

const theme = createMuiTheme({
    typography: {
        useNextVariants: true
    },
    palette: {
        primary: {
            light: blue[300],
            main: blue[500],
            dark: blue[700],
            contrastText: '#fff'
        }
    }
})

const styles = (theme) => ({
    container: {
        width: '1200px',
        margin: '0 auto'
    },
    input: {
        display: 'none'
    },
    button: {
        margin: theme.spacing.unit
    },
    snackbar: {
        margin: theme.spacing.unit
    },
    fileHash: {
        color: '#fff',
        underline: 'none'
    },
    tableCell: {
        maxWidth: '540px',
        textOverflow: 'ellipsis',
        overflow: 'hidden'
    }
})

@withStyles(styles)
export default class App extends React.Component {

    state = {
        addedFileHash: null,
        tokenId: [],
        tokenOwner: [],
        tokenMetaData: [],
        ipfsJsonInfo: [],
        loading: false,
        toAddress: '',
        toId: 0
    }

    //ipfs initial
    // ipfsApi = ipfsAPI('localhost', '5001')
    ipfsApi = ipfsAPI('ipfs.infura.io', '5001', { protocol: 'https' });

    //qtum initial
    contract = (new Qtum('http://localhost:8010', repo)).contract('src/QRC721.sol')

    jsonContent = {}

    componentDidMount() {
        this.getAllTokenInfo()
    }

    captureFile = (event) => {
        event.stopPropagation()
        event.preventDefault()
        const file = event.target.files[0]
        const reader = new window.FileReader()
        this.jsonContent['file_name'] = event.target.files[0]['name']
        reader.onloadend = () => this.saveToIpfs(reader)
        reader.readAsArrayBuffer(file)
    }

    handleChange = (e) => {
        this.setState({
            [e.target.name]: e.target.value
        })
    }

    exchange = () => {
        const { toAddress, toId } = this.state
        let tx = {}
        tx.toaddr = this.state.toAddress
        tx.id = this.state.toId
        const transferTX = this.transfer(tx)
    }


    // get all tokenInfo from QtumTestnet and ipfs
    getAllTokenInfo = async () => {
        let tokenIdArray = []
        let URIArray = []
        let JsonInfoArray =[]
        let getJsonInfo = []
        let tokenOwnerArray = []

        //get each record in the contract
        const getIndexRes = await this.contract.call("totalSupply")
        const tokenIndex = getIndexRes["outputs"][0]["words"][0]
        console.log("how many records in the contract:", tokenIndex)

        if(tokenIndex != 0){

            // get tokenId from QtumTestnet QRC721 contract
            const getRecordRes = await Promise.all(Array.from({ length: tokenIndex }, (item, i) => this.contract.call("tokenByIndex", [i])))
            getRecordRes.forEach((recordRes) => {
                const oneRecord = recordRes['outputs'][0].toNumber()
                tokenIdArray.push(oneRecord)
            })
            this.setState({
                tokenId: tokenIdArray
            })
            console.log(" get tokenId:", tokenIdArray[0])
            console.log(" get tokenId:", tokenIdArray[1])
            console.log(" get tokenId:", tokenIdArray[2])

            // get tokenOwner from QtumTestnet QRC721 contract
            const getTokenOwner = await Promise.all(Array.from({ length: tokenIndex }, (item, i) => this.contract.call("ownerOf", [tokenIdArray[i]])))
            getTokenOwner.forEach((tokenOwners) => {
                const oneTokenOwner = tokenOwners['outputs'][0].toString()
                tokenOwnerArray.push(oneTokenOwner)
            })
            this.setState({
                tokenOwner: tokenOwnerArray 
            })

            // get tokenURI from QtumTestnet QRC721 contract
            const getTokenURI = await Promise.all(Array.from({ length: tokenIndex }, (item, i) => this.contract.call("tokenURI", [tokenIdArray[i]])))
            getTokenURI.forEach((tokenURI) => {
                const oneTokenURI = tokenURI['outputs'][0].toString()
                URIArray.push(oneTokenURI)
            })
            this.setState({
                tokenMetaData: URIArray
            })
            console.log("get tokenURI:", URIArray)

            // get Json of uploaded file from ipfs
            getJsonInfo = await Promise.all(Array.from(URIArray, (item,i) => this.ipfsApi.get(item)))
            getJsonInfo.forEach((Hash) => {
                const jsonInfo = JSON.parse(Hash[0].content)
                console.log("to string", jsonInfo)
                JsonInfoArray.push(jsonInfo)
            })
            this.setState({
                ipfsJsonInfo: JsonInfoArray
            })
            console.log("get ipfsJsonInfo:", JsonInfoArray) 
        }
    }

    transfer = async (tx) => {
        let fromaddr = '788eb9a8c871c523659149d37c2a94e6c0a6c179'
        const txresult = await this.contract.send("transferFrom", [fromaddr, tx.toaddr, tx.id])
        console.log("transfer tx:", txresult.txid)
    }

    saveToIpfs = async (reader) => {
        let ipfsId = ''
        const bufferFile = Buffer.from(reader.result)
        this.setState({ loading: true })

        //get each record in the contract
        const getIndexRes = await this.contract.call("totalSupply")
        const tokenIndex = getIndexRes["outputs"][0]["words"][0]
        console.log("how many records in the contract:", tokenIndex) 


        //add a file to ipfs
        try {
            // add file users uploaded to ipfs
            let myDate = new Date()
            const response = await this.ipfsApi.add(bufferFile, { progress: (prog) => console.log(`received: ${prog}`) })
            console.log(response)
            ipfsId = response[0].hash
            this.jsonContent['ipfs_id'] = ipfsId
            this.jsonContent['time'] = myDate.toLocaleString()
            console.log("1,send json infomation", this.jsonContent)
            this.setState({ addedFileHash: ipfsId, loading: false })

            // add file hash to a JSON and upload Json to ipfs, get Json's hash in ipfs and store in contract
            const bufferJson = Buffer.from(JSON.stringify(this.jsonContent))
            const responseJson = await this.ipfsApi.add(bufferJson, { progress: (prog) => console.log(`received: ${prog}`) })
            let mintURI = responseJson[0].hash
            fromAddr = 'qUYqDmqgA5w8kkojgwoi4cmc18Y3tm8yPE'
            let address = '788eb9a8c871c523659149d37c2a94e6c0a6c179'
            let tokenId = tokenIndex + 1
            const sendRes = await this.contract.send("mintWithTokenURI", [address, tokenId, mintURI], { gasLimit: 1000000})
            console.log("2,json response hash:", mintURI)
        } catch (e) {
            console.error(e)
        }
    }

    render() {
        const { addedFileHash, tokenId, tokenOwner, tokenMetaData, ipfsJsonInfo, loading } = this.state
        const { classes } = this.props
        console.log('rendering')
        return (
            <MuiThemeProvider theme={theme}>
                <Grid className={classes.container} container spacing={24}>
                    <CssBaseline />
                    <Grid item xs={4}>
                        <input
                            className={classes.input}
                            id="outlined-button-file"
                            type="file"
                            onChange={this.captureFile}
                        />
                        <label htmlFor="outlined-button-file">
                            {
                                loading ? <CircularProgress className={classes.progress} />
                                    :
                                    <Button
                                        variant="outlined"
                                        component="span"
                                        color="primary"
                                        className={classes.button}
                                    >
                                        Upload
                                    </Button>
                            }
                        </label>
                    </Grid>
                    <Grid item xs={8}>
                        {
                            addedFileHash ?
                                <div>
                                    <Button
                                        variant="outlined"
                                        component="a"
                                        color="primary"
                                        className={classes.button}
                                        target='_blank'
                                        href={'https://ipfs.infura.io/ipfs/' + addedFileHash}
                                    >
                                        {addedFileHash}
                                    </Button>
                                </div>
                                :
                                null
                        }
                    </Grid>
                    <Grid item xs={4}>
                        <input
                            className={classes.content}
                            type="string"
                            onChange={this.handleChange}
                            name="toAddress"
                            //value={this.state.toAddress}
                        />
                        <input
                            className={classes.content}
                            type="string"
                            onChange={this.handleChange}
                            name="toId"
                            //value={this.state.toId}
                        />
                        <Button
                            variant="outlined"
                            component="span"
                            color="primary"
                            className={classes.button}
                            onClick={this.exchange}
                        >
                            Transfer
                        </Button>
                    </Grid>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className={classes.tableCell}>{"tokenId"}</TableCell>
                                <TableCell className={classes.tableCell}>{"tokenOwner"}</TableCell>
                                <TableCell className={classes.tableCell}>{"MetaData"}</TableCell> 
                                <TableCell className={classes.tableCell}>{"ipfsName"}</TableCell>
                                <TableCell className={classes.tableCell}>{"ipfsHash"}</TableCell>
                                <TableCell className={classes.tableCell}>{"uploadTime"}</TableCell>
                            </TableRow>
                            {
                                ipfsJsonInfo.map((Jsonfile, i) => (
                                    <TableRow key={`json-file-${i}`}>
                                        <TableCell className={classes.tableCell}>{tokenId[i]}</TableCell>
                                        <TableCell className={classes.tableCell}>{tokenOwner[i]}</TableCell>
                                        <TableCell className={classes.tableCell}>{tokenMetaData[i]}</TableCell> 
                                        <TableCell className={classes.tableCell}>{Jsonfile['file_name']}</TableCell>
                                        <TableCell className={classes.tableCell}>
                                            <Grid item xs={8}>
                                            {
                                            <div>
                                                <Button
                                                variant="outlined"
                                                component="a"
                                                color="primary"
                                                className={classes.button}
                                                target='_blank'
                                                href={'https://ipfs.infura.io/ipfs/' + Jsonfile['ipfs_id']}
                                                >
                                                {Jsonfile['ipfs_id']}
                                                </Button>
                                                </div>
                                            }
                                            </Grid>
                                        </TableCell>
                                        <TableCell className={classes.tableCell}>{Jsonfile['time']}</TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </Grid>
            </MuiThemeProvider>
        )
    }
}