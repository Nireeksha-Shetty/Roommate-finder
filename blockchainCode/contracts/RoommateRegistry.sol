// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Stores roommate consent records and review hashes.
/// No personal data is ever written here - only wallet addresses and hashes.
contract RoommateRegistry {

    // keccak256(granter, receiver) => consent given?
    mapping(bytes32 => bool) private consents;

    // keccak256(reviewText) => was this review ever published?
    mapping(bytes32 => bool) public reviewHashes;

    event ConsentGranted(address indexed granter, address indexed receiver);
    event ConsentRevoked(address indexed granter, address indexed receiver);
    event ReviewStored(address indexed author, bytes32 reviewHash);

    function _key(address granter, address receiver) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(granter, receiver));
    }

    /// Caller allows `receiver` to see their contact details.
    function grantConsent(address receiver) external {
        require(receiver != address(0), "Receiver address is empty");
        require(receiver != msg.sender, "Cannot grant consent to yourself");
        consents[_key(msg.sender, receiver)] = true;
        emit ConsentGranted(msg.sender, receiver);
    }

    /// Caller withdraws consent previously given to `receiver`.
    function revokeConsent(address receiver) external {
        consents[_key(msg.sender, receiver)] = false;
        emit ConsentRevoked(msg.sender, receiver);
    }

    /// True if `granter` has allowed `receiver` to see their contact details.
    /// The backend calls this before returning any phone number or email.
    function hasConsent(address granter, address receiver) external view returns (bool) {
        return consents[_key(granter, receiver)];
    }

    /// Publish the hash of a review so the text cannot be edited later.
    function storeReview(bytes32 reviewHash) external {
        require(reviewHash != bytes32(0), "Review hash is empty");
        require(!reviewHashes[reviewHash], "This review is already stored");
        reviewHashes[reviewHash] = true;
        emit ReviewStored(msg.sender, reviewHash);
    }

    /// Re-hash the review text from the database and check it here.
    /// A false result means the stored text was tampered with.
    function verifyReview(bytes32 reviewHash) external view returns (bool) {
        return reviewHashes[reviewHash];
    }
}
