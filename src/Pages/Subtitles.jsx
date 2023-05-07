import React from 'react'
import UserService from '../Services/KeycloakServices'
import "./PagesCSS/Subtitle.css"

const Subtitles = () => {
  return (
    <>
<div className="body-content d-flex ">

<div className="left-section">
    <div className="innerhead d-flex justify-content-between">
        <div className="btn-group" role="group" aria-label="Basic mixed styles example">
            <button type="button" className="btn btn-success">Subtitels</button>
            
            <button type="button" className="btn btn-tr">Questions</button>
        </div>
        <div className="right-sec">
            <div className="btn-group" role="group" aria-label="Basic mixed styles example">
                <div className="input-box">
                    <label className="w-100">Slide</label>
                    <input className="" type="text" placeholder="Search" aria-label="Search"/>
                </div>
                <button type="button" className="btn btn-tr">LTR</button>
                
                <button type="button" className="btn btn-tr"><img src="image/Vector.svg"/></button>
            </div>
        </div>
    </div>

        <div className="tab-sec">
            <div className="top-tab">
                <ul className="nav nav-tabs " id="myTab" role="tablist">
                    <li className="nav-item" role="presentation">
                        <button className="nav-link active" id="home-tab" data-bs-toggle="tab" data-bs-target="#home" type="button" role="tab" aria-controls="home" aria-selected="true">Home Home Home Home Home</button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button className="nav-link" id="profile-tab" data-bs-toggle="tab" data-bs-target="#profile" type="button" role="tab" aria-controls="profile" aria-selected="false">Profile ProfileProfile ProfileProfile</button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button className="nav-link" id="messages-tab" data-bs-toggle="tab" data-bs-target="#messages" type="button" role="tab" aria-controls="messages" aria-selected="false">Messages MessagesMessagesMessages</button>
                    </li>
                </ul>
            </div>
    
            <div className="tab-content overflow-y-auto">
                <div className="tab-pane active" id="home" role="tabpanel" aria-labelledby="home-tab" tabindex="0">
                    <div className="box-content">
                        Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classNamees to control the content visibility and styling.
                    </div>
                    <div className="box-content">
                        Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classNamees to control the content visibility and styling.
                    </div>
                    <div className="box-content">
                        Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classNamees to control the content visibility and styling.
                    </div>
                    <div className="box-content">
                        Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classNamees to control the content visibility and styling.
                    </div>
                    <div className="box-content">
                        Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classNamees to control the content visibility and styling.
                    </div>
                    <div className="box-content">
                        Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classNamees to control the content visibility and styling.
                    </div>
                </div>
                <div className="tab-pane" id="profile" role="tabpanel" aria-labelledby="profile-tab" tabindex="0">2 Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classNamees to control the content visibility and styling. You can use it with tabs, pills, and any other .nav-powered navigation.</div>
                <div className="tab-pane" id="messages" role="tabpanel" aria-labelledby="messages-tab" tabindex="0">3 Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classNamees to control the content visibility and styling. You can use it with tabs, pills, and any other .nav-powered navigation.</div>
            </div>
    
        </div>
    </div>

    <div className="right-section">
        <div className="first-sec">
            <div className="video">
                <div className="ratio ratio-16x9">
                    <iframe src="https://www.youtube.com/embed/zpOULjyy-n8?rel=0" title="YouTube video" allowfullscreen></iframe>
                  </div> 
            </div>
            <div className="box">
                זאת אומרת, שאם הקב"ה יתן לו זה, שתהיה לו היכולת לבטל את רשותו ולהיבטל לרשותו של הקב"ה, שהוא רוצה, שתהיה רק רשות היחיד בעולם, היינו רשותו של הקב"ה, שזו כל ישועתו, זה נקרא שיש לו כלי וצורך שהקב"ה יעזור לו.

            </div>
        </div>
        <div className="book-mark whit-s">
            <div className="top-head"><h3>Bookmarks</h3></div>
        </div>

        <div className="Questions whit-s">
            <div className="top-head d-flex justify-content-between">
                <h3>Questions</h3>
                <div className="input-box">
                   
                    <input className="" type="text" placeholder="Search" aria-label="Search"/>
                </div>
            </div>
        </div>


    </div>


</div>

    </>
  )
}

export default Subtitles