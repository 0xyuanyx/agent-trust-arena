// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AgentDecisionLogger {
    enum Verdict {
        Approved,
        Warned,
        Blocked,
        HumanReviewRequired
    }

    event DecisionLogged(
        bytes32 indexed agentId,
        bytes32 indexed scenarioId,
        bytes32 intentHash,
        bytes32 planHash,
        bytes32 calldataHash,
        Verdict verdict,
        int16 scoreDelta,
        string metadataURI,
        uint256 timestamp
    );

    function logDecision(
        bytes32 agentId,
        bytes32 scenarioId,
        bytes32 intentHash,
        bytes32 planHash,
        bytes32 calldataHash,
        Verdict verdict,
        int16 scoreDelta,
        string calldata metadataURI
    ) external {
        emit DecisionLogged(
            agentId,
            scenarioId,
            intentHash,
            planHash,
            calldataHash,
            verdict,
            scoreDelta,
            metadataURI,
            block.timestamp
        );
    }
}
