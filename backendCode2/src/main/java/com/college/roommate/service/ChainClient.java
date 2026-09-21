package com.college.roommate.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Reads the RoommateRegistry contract directly over JSON-RPC.
 *
 * We hand-encode the call instead of pulling in Web3j, because we only ever
 * need one read-only function. An eth_call is just:
 *
 *     4-byte function selector + each argument padded to 32 bytes
 *
 * All writes (grantConsent, storeReview) happen in the browser through
 * MetaMask, so the backend never needs a private key.
 */
@Service
public class ChainClient {

    /** First 4 bytes of keccak256("hasConsent(address,address)"). */
    private static final String HAS_CONSENT_SELECTOR = "a9373e4b";

    private final RestTemplate http = new RestTemplate();
    private final String rpcUrl;
    private final String contractAddress;

    public ChainClient(@Value("${chain.rpc}") String rpcUrl,
                       @Value("${chain.contract}") String contractAddress) {
        this.rpcUrl = rpcUrl;
        this.contractAddress = contractAddress;
    }

    /** Pad a 20-byte address to the 32 bytes the ABI expects. */
    private String padAddress(String address) {
        String clean = address.toLowerCase().replaceFirst("^0x", "");
        return "0".repeat(64 - clean.length()) + clean;
    }

    /**
     * Ask the contract whether granter has allowed receiver to see their
     * contact details. Returns false if the node is unreachable, so a stopped
     * Hardhat node fails closed rather than leaking phone numbers.
     */
    public boolean hasConsent(String granterWallet, String receiverWallet) {
        if (granterWallet == null || receiverWallet == null) {
            return false;
        }

        String data = "0x" + HAS_CONSENT_SELECTOR
                + padAddress(granterWallet)
                + padAddress(receiverWallet);

        Map<String, Object> request = Map.of(
                "jsonrpc", "2.0",
                "id", 1,
                "method", "eth_call",
                "params", List.of(
                        Map.of("to", contractAddress, "data", data),
                        "latest"
                )
        );

        try {
            Map<?, ?> response = http.postForObject(rpcUrl, request, Map.class);
            if (response == null || response.get("result") == null) {
                return false;
            }
            // A returned bool is 31 zero bytes then 00 or 01.
            String result = response.get("result").toString();
            return result.endsWith("1");
        } catch (Exception e) {
            System.err.println("Could not reach the blockchain node: " + e.getMessage());
            return false;
        }
    }
}
