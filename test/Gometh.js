/* global artifacts */
/* global contract */
/* global assert */

const assertFail = require("./helpers/assertFail.js");

const GomethMain = artifacts.require("../contracts/GomethMain.sol");
const GomethSide = artifacts.require("../contracts/GomethSide.sol");
const WETH = artifacts.require("../contracts/WETH.sol");

contract("GomethMain", (accounts) => {

    let parent;
    let child;
    let weth;

    const {
        0: user1,
        1: user2,
        2: poa1,
        3: poa2,
        4: poa3,
        5: poa4
    } = accounts;

    const uint256hex = v => {
        return v.toString(16).padStart(64,'0')
    }

    sign = (epoch,txid, data, acc) => {

        let preimage = uint256hex(epoch)+txid.substr(2)+data.substr(2)
        let hash = web3.sha3(preimage, {encoding: 'hex'})

        var sig = web3.eth.sign(acc, hash).slice(2)

        var r = `0x${sig.slice(0, 64)}`
        var s = `0x${sig.slice(64, 128)}`
        var v = web3.toDecimal(sig.slice(128, 130)) + 27
        return ["0x"+uint256hex(v),r,s]
    } 

    beforeEach(async () => {
        let initialSigners = [poa1,poa2,poa3].sort()
        main = await GomethMain.new(initialSigners);
        side = await GomethSide.new(initialSigners);
        weth = await WETH.new(side.address);
        await side.init(weth.address)
    });

    it("Lock ethers", async () => {

        // lock ethers ----------------------------------------

        const amount = web3.toWei(1,'ether')

        assert((await weth.balanceOf(user1))==0)

        let res = await main.lock( { value : amount, from: user1  });

        assert(res.logs[0].event == 'LogLock');
        let lockFrom = res.logs[0].args.from  
        let lockValue = res.logs[0].args.value

        let txid = web3.sha3("txid")
        let epoch = (await side.getEpochs())-1
        let data = side._mintmultisigned.request(lockFrom,lockValue).params[0].data;
        await side.partialExecuteOff(txid,data,sign(epoch,txid,data,poa1))
        await side.partialExecuteOff(txid,data,sign(epoch,txid,data,poa2))

        assert((await weth.balanceOf(user1)).eq(amount))

    });



});