// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;


import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FunctionsClient} from "@chainlink/contracts@1.4.0/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts@1.4.0/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts@1.4.0/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";


/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract FunctionsConsumerExample is FunctionsClient, ConfirmedOwner, ERC721URIStorage {
    using FunctionsRequest for FunctionsRequest.Request;

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    string constant SOURCE = 
'if (!secrets.apiKey){ throw Error("Api key is not provided");}'
"const playerAddress = args[0];"
'const apiResponse = await Functions.makeHttpRequest({'
    'url:`https://djt72jn26o3kh63g6lthlaq3ei0fowvb.lambda-url.ap-southeast-2.on.aws/?player=${playerAddress}`,'
    'headers:{"api-key": secrets.apiKey,}});'
'if (apiResponse.error){throw Error("Request failed");}'
'const { data} = apiResponse;'
'if(!data.score){throw Error("score does not exist");}'
'return Functions.encodeInt256(data.score);';

    uint8 private donHostedSecretsSlotID;
    uint64 private donHostedSecretsVersion;
    uint64 private subscriptionId;
    uint256 private tokenId = 0;
    uint32 constant GAS_LIMIT = 300_000;
    address constant ROUTER = 0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0;
    bytes32 constant donID = 0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000;
    string constant META_DATA = "https://ipfs.io/ipfs/QmeiBwxSJyoLgPi4yfvkNdxK9jJ8WyGaEBMwHFhS7apF81";
    mapping(bytes32 requestId => address) private requestToAddresses;

    error UnexpectedRequestID(bytes32 requestId);

    event Response(bytes32 indexed requestId, bytes response, bytes err);

    constructor() FunctionsClient(ROUTER) ConfirmedOwner(msg.sender) ERC721("BlackJack", "BLK"){}

    function setConfiguation(
        uint8 _slotID,
        uint64 _ver,
        uint32 _subscriptionId
    ) external {
        donHostedSecretsSlotID = _slotID;
        donHostedSecretsVersion = _ver;
        subscriptionId = _subscriptionId;
    }

    /**
     * @notice Send a simple request
     * @param args List of arguments accessible from within the source code
     */
    function sendRequest(
        string[] memory args,
        address player
        
    ) external  returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE);

        req.addDONHostedSecrets(
            donHostedSecretsSlotID,
            donHostedSecretsVersion
        );

        if (args.length > 0) req.setArgs(args);
        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            GAS_LIMIT,
            donID
        );
        requestToAddresses[s_lastRequestId] = player;
        return s_lastRequestId;
    }

    /**
     * @notice Store latest result/error
     * @param requestId The request ID, returned by sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }
        s_lastResponse = response;

        
        (int256 scoreValue) = abi.decode(response, (int256));
        address player = requestToAddresses[requestId];
        if(scoreValue > 1000){
            _safeMint(player, tokenId);
            _setTokenURI(tokenId, META_DATA);
            tokenId++;
        }

        s_lastError = err;
        emit Response(requestId, s_lastResponse, s_lastError);
    }
}
