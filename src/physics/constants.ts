export const PhysicsConstants = {
    // Fundamental constants
    speedOfLightInVacuum_MeterPerSecond: 299792458,
    gravitationalConstant_MeterCubedPerKilogramSecondSquared: 6.6743e-11,
    planckConstant_JouleSecond: 6.62607015e-34,
    reducedPlanckConstant_JouleSecond: 1.054571817e-34,
    elementaryCharge_Coulomb: 1.602176634e-19,
    boltzmannConstant_JoulePerKelvin: 1.380649e-23,
    avogadroConstant_PerMole: 6.02214076e23,
    fineStructureConstant: 7.2973525693e-3,
    stefanBoltzmannConstant_WattPerMeterSquaredKelvinToTheFourth: 5.670374419e-8,

    // Electron and particle masses
    electronMass_Kilogram: 9.1093837015e-31,
    protonMass_Kilogram: 1.67262192369e-27,
    neutronMass_Kilogram: 1.67492749804e-27,

    // Permeability and permittivity
    vacuumPermeability_HenryPerMeter: 1.25663706212e-6,
    vacuumPermeability_FaradPerMeter: 8.8541878128e-12,

    // Rydberg and Bohr
    rydbergConstant_PerMeter: 10973731.568508,
    bohrRadius_Meter: 5.29177210903e-11,

    // Derived units
    electronVolt_Joule: 1.602176634e-19,
    atomicMassUnit_Kilogram: 1.6605390666e-27,

    // Cosmological (approx)
    hubbleConstant_KilometerPerSecondMegaparsec: 70,
} as const; // Makes all properties readonly literals
