// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title AbstrackPaymaster
/// @notice General paymaster that sponsors gas fees for all transactions.
///         Deploy, fund with ETH, and pass as the `paymaster` param in AGW calls.

// --- Minimal zkSync system interfaces (inline to avoid heavy dependency) ---

/// @dev The formal address of the bootloader on zkSync/Abstract.
address constant BOOTLOADER_FORMAL_ADDRESS = address(0x8001);

/// @dev Magic value returned to indicate successful paymaster validation.
bytes4 constant PAYMASTER_VALIDATION_SUCCESS_MAGIC = bytes4(
    keccak256("paymaster")
);

/// @dev Subset of the zkSync Transaction struct used by the paymaster interface.
struct Transaction {
    uint256 txType;
    uint256 from;
    uint256 to;
    uint256 gasLimit;
    uint256 gasPerPubdataByteLimit;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    uint256 paymaster;
    uint256 nonce;
    uint256 value;
    uint256[4] reserved;
    bytes data;
    bytes signature;
    bytes32[] factoryDeps;
    bytes paymasterInput;
    bytes reservedDynamic;
}

/// @dev Execution result enum used by postTransaction.
enum ExecutionResult {
    Revert,
    Success
}

/// @dev Selector for the "general" paymaster flow.
bytes4 constant GENERAL_FLOW_SELECTOR = bytes4(keccak256("general(bytes)"));

// --- Paymaster contract ---

contract AbstrackPaymaster {
    address public owner;

    modifier onlyBootloader() {
        require(
            msg.sender == BOOTLOADER_FORMAL_ADDRESS,
            "Only bootloader can call this method"
        );
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Called by the bootloader to validate and pay for a transaction.
    function validateAndPayForPaymasterTransaction(
        bytes32,
        bytes32,
        Transaction calldata _transaction
    )
        external
        payable
        onlyBootloader
        returns (bytes4 magic, bytes memory context)
    {
        magic = PAYMASTER_VALIDATION_SUCCESS_MAGIC;

        require(
            _transaction.paymasterInput.length >= 4,
            "Paymaster input too short"
        );

        bytes4 paymasterInputSelector = bytes4(_transaction.paymasterInput[0:4]);
        require(
            paymasterInputSelector == GENERAL_FLOW_SELECTOR,
            "Unsupported paymaster flow"
        );

        uint256 requiredETH = _transaction.gasLimit * _transaction.maxFeePerGas;

        (bool success, ) = payable(BOOTLOADER_FORMAL_ADDRESS).call{
            value: requiredETH
        }("");
        require(success, "Failed to transfer fee to bootloader");
    }

    /// @notice Called after transaction execution. No-op for general paymaster.
    function postTransaction(
        bytes calldata,
        Transaction calldata,
        bytes32,
        bytes32,
        ExecutionResult,
        uint256
    ) external payable onlyBootloader {}

    /// @notice Allow owner to withdraw remaining ETH.
    function withdraw(address payable _to) external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = _to.call{value: balance}("");
        require(success, "Withdraw failed");
    }

    /// @notice Accept ETH deposits.
    receive() external payable {}
}
