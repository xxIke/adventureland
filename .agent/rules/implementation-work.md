1. Component documentation is canonical for requirements, design, and contracts. Read it before modifying implementation.
2. Requirements and design documentation must exist before implementation begins (M1). If missing, document first.
3. Contracts are the stable interface — implementations behind contracts can change freely. Design contracts from requirements, then implement to contracts.
4. Planning artifacts and session transcripts are historical input. They inform documentation but are not canonical once component docs exist.
5. Run tests after implementation changes. Fix failing contract tests before adding new functionality.
6. Update component documentation when contracts, behavior, or operations change (M6).
