{
    const activity = icu.activity;
    const streams = icu.streams;

    // config vars
    const crankLength_mm = activity.crank_length || 172.5;
    const ftp = activity.icu_ftp;
    const minCadence = 20;
    const maxPower = ftp * 6;

    // script

    const crankLength_m = crankLength_mm / 1000;
    let pwr = [];
    let cad = [];

    const pwrStream = streams.get('fixed_watts');
    if (pwrStream != null) {
        pwr = pwrStream.data;
    }

    const cadStream = streams.get('cadence');
    if (cadStream != null) {
        cad = cadStream.data;
    }

    const baseAepf = aepf(ftp, 80, crankLength_m);
    const baseCvp = cpv(80, crankLength_m);

    let numQuad1 = 0;
    let numQuad2 = 0;
    let numQuad3 = 0;
    let numQuad4 = 0;
    let numTotal = 0;

    const x = [];
    const y = [];
    const ftpParabolaX = [];
    const ftpParabolaY = [];

    let cpvMax = 0;
    let aepfMax = 0;

    pwr.forEach((P, idx) => {
        const C = cad[idx];

        if (P && C && P < maxPower && C > minCadence) {
            const cpvVal = cpv(C, crankLength_m);
            const aepfVal = aepf(P, C, crankLength_m);

            if(!isNaN(cpvVal) && !isNaN(aepfVal)) {
                if(cpvVal > cpvMax) { 
                    cpvMax = cpvVal;
                }
    
                if(aepfVal !== Infinity && aepfVal > aepfMax) {
                    aepfMax = aepfVal;
                }

                // quadrant 1 (top right) count
                if(cpvVal >= baseCvp && aepfVal >= baseAepf) {
                    numQuad1++;
                }
                // quadrant 2 (top left) count
                if(cpvVal < baseCvp && aepfVal >= baseAepf) {
                    numQuad2++;
                }
                // quadrant 3 (bottom left) count
                if(cpvVal < baseCvp && aepfVal < baseAepf) {
                    numQuad3++;
                }
                // quadrant 4 (bottom right) count
                if(cpvVal >= baseCvp && aepfVal < baseAepf) {
                    numQuad4++;
                }

                numTotal++;

                x.push(cpvVal);
                y.push(aepfVal);
            }
        }
    });

    for(let i = 0; i <=200; i++) {
        ftpParabolaX.push(cpv(i, crankLength_m));
        ftpParabolaY.push(aepf(ftp, i, crankLength_m));
    }

    cpvMax += .5
    aepfMax += 10;

    let data = [
        {
            x: x,
            y: y,
            type: 'scatter',
            mode: 'markers',
            marker: {
                size: 2,
            },
            showlegend: false,
            name: 'CVP vs AEPF'
        },
        {
            x: [0, cpvMax],
            y: [baseAepf, baseAepf],
            type: 'lines',
            line: {
                dash: 'dashdot',
                width: 1,
                color: '#999'
            },
            showlegend: false,
            name: `AEPF at FTP (${ftp}w)`
        },
        {
            x: [baseCvp, baseCvp],
            y: [0, aepfMax],
            type: 'lines',
            line: {
                dash: 'dashdot',
                width: 1,
                color: '#999'
            },
            showlegend: false,
            name: `CVP at FTP (${ftp}w)`
        },
        {
            x: ftpParabolaX,
            y: ftpParabolaY,
            type: 'lines',
            line: {
                width: 1
            },
            showlegend: false,
            name: `FTP (${ftp}w)`
        }
    ];

    const annotationSettings = {
        bgcolor: '#eee',
        opacity: 0.8,
        borderradius: 5,
        font: {
            color: '#666'
        }
    }

    let layout = {
        title: {
            text: `Quadrant Analysis`,
        },
        xaxis: {
            title: 'Circumferential Pedal Velocity (CPV), (m/s)',
            range: [0, cpvMax],
            autorange: false,
            titlefont: {
                color: 'lightgray'
            }
        },
        yaxis: {
            title: 'Average Effective Pedal Force (AEPF), (N)',
            range: [0, aepfMax],
            autorange: false,
            titlefont: {
                color: 'lightgray'
            }
        },
        annotations: [
            {
                x: cpvMax - .1,
                y: baseAepf + 30,
                text: `HF / HV (${Math.round(numQuad1 / numTotal * 100)}%)`,
                showarrow: false,
                ...annotationSettings
            },
            {
                x: .1,
                y: baseAepf + 30,
                text: `HF / LV (${Math.round(numQuad2 / numTotal * 100)}%)`,
                showarrow: false,
                ...annotationSettings
            },
            {
                x: .1,
                y: baseAepf - 30,
                text: `LF / LV (${Math.round(numQuad3 / numTotal * 100)}%)`,
                showarrow: false,
                ...annotationSettings
            },
            {
                x: cpvMax - .1,
                y: baseAepf - 30,
                text: `LF / HV (${Math.round(numQuad4 / numTotal * 100)}%)`,
                showarrow: false,
                ...annotationSettings
            }
        ]
    };

    chart = { data, layout };
}

function aepf(power, cadence, cranklength) {
    return (power * 60) / (cadence * 2 * Math.PI * cranklength);
}

function cpv(cadence, cranklength) {
    return (cadence * cranklength * 2 * Math.PI) / 60;
}
